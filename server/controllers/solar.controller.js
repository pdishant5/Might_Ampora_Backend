import axios from "axios";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// format Date -> YYYY-MM-DD 
function isoDateUTC(date) {
    return date.toISOString().slice(0, 10);
}

/**
 * Convert daily value returned by Open-Meteo:
 * - Open-Meteo's daily shortwave_radiation_sum is usually in MJ/m^2.
 * - Convert to kWh/m^2/day: kWh = MJ * (1 / 3.6)  (1 kWh = 3.6 MJ)
 * If dailyUnits === 'MJ/m²' do MJ -> kWh conversion.
 * If dailyUnits === 'Wh/m²' do Wh -> kWh conversion (/1000).
 */
function convertDailyToKWh(value, unit) {
    if (value === null || value === undefined) return null;
    if (!unit) unit = 'MJ/m²';
    if (unit.toLowerCase().includes('mj')) {
        return value / 3.6; // MJ -> kWh
    } else if (unit.toLowerCase().includes('wh')) {
        return value / 1000; // Wh -> kWh
    } else {
        // fallback assume MJ
        return value / 3.6;
    }
}

export const checkSolarStatus = asyncHandler(async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
        return res.status(400).json({ error: 'Missing lat or lon query parameters.' });
    }

    // compute date window: last 30 full days (exclude today)
    // endDate = yesterday 
    const endDateObj = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const startDateObj = new Date(endDateObj.getTime() - 29 * 24 * 60 * 60 * 1000); // 30 days total

    const startDate = isoDateUTC(startDateObj);
    const endDate = isoDateUTC(endDateObj);

    //  Fetch daily shortwave_radiation_sum (past 30 days)
    // daily shortwave_radiation_sum unit is often MJ/m^2 (see docs)
    const dailyUrl = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&daily=shortwave_radiation_sum&start_date=${startDate}&end_date=${endDate}&timezone=UTC`;

    // Fetch recent hourly shortwave_radiation (preceding hour mean, W/m^2)
    // Use past_hours=3 to ensure we include at least the last hour values
    const hourlyUrl = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&hourly=shortwave_radiation&past_hours=3&timezone=auto`;

    // Make requests in parallel
    const [dailyResp, hourlyResp] = await Promise.all([
        axios.get(dailyUrl),
        axios.get(hourlyUrl)
    ]);

    // parse daily
    const dailyData = (dailyResp.data && dailyResp.data.daily) || {};
    const dailyTimes = dailyData.time || [];
    const dailyRaw = dailyData.shortwave_radiation_sum || [];
    const dailyUnits = (dailyResp.data.daily_units && dailyResp.data.daily_units.shortwave_radiation_sum) || 'MJ/m²';

    // Convert daily values to kWh/m^2/day and build array
    const dailyKwhData = dailyTimes.map((d, i) => {
        const raw = dailyRaw[i] === null || dailyRaw[i] === undefined ? null : dailyRaw[i];
        const kwh = raw !== null ? convertDailyToKWh(raw, dailyUnits) : null;
        return { date: d, raw_value: raw, raw_unit: dailyUnits, value_kwh_m2: kwh !== null ? Number(kwh.toFixed(4)) : null };
    }).filter(x => x.value_kwh_m2 !== null); // drop nulls for averaging

    if (dailyKwhData.length === 0) {
        return res.status(500).json({ error: 'No daily radiation data available for that location/time window.' });
    }

    // compute average daily kWh/m^2/day
    const sumKwh = dailyKwhData.reduce((s, it) => s + it.value_kwh_m2, 0);
    const avgKwh = sumKwh / dailyKwhData.length;

    // classification thresholds (tunable)
    // Low: < 3.0 kWh/m^2/day (poor)
    // Medium: 3.0 - 5.0 kWh/m^2/day (viable)
    // High: >= 5.0 kWh/m^2/day (excellent)
    const thresholds = { low: 3.0, high: 5.0 }; // medium is between low and high
    let category = 'Low';
    if (avgKwh >= thresholds.high) category = 'High';
    else if (avgKwh >= thresholds.low) category = 'Medium';

    // parse hourly - find most recent non-null value
    const hourly = (hourlyResp.data && hourlyResp.data.hourly) || {};
    const hourlyTimes = hourly.time || [];
    const hourlyValues = hourly.shortwave_radiation || [];

    let recent = null;
    for (let i = hourlyValues.length - 1; i >= 0; i--) {
        const val = hourlyValues[i];
        if (val !== null && val !== undefined) {
            recent = { time: hourlyTimes[i], value_w_m2: val };
            break;
        }
    }

    // build response
    const result = {
        location: { latitude: Number(lat), longitude: Number(lon) },
        period: { start_date: startDate, end_date: endDate, days_used: dailyKwhData.length },
        average_daily_irradiance_kwh_m2: Number(avgKwh.toFixed(4)),
        classification: category,
        thresholds_kwh_m2_per_day: thresholds,
        daily: dailyKwhData, // array of {date, raw_value (MJ/m2), value_kwh_m2}
        latest_hourly_irradiance: recent, // {time (UTC), value_w_m2}
        notes: {
            daily_raw_unit: dailyUnits,
            conversion: 'daily sums converted to kWh/m^2/day (MJ -> kWh by dividing by 3.6 if unit is MJ/m^2).',
            suggestion: 'This is a site-level screening based on radiation only. For a production estimate you should include tilt/azimuth, system losses, shading analysis, and panel specs.'
        }
    };

    return res.status(200).json(new ApiResponse(200, result, "Solar status checked successfully!"));
});
import dayjs from "dayjs";

/**
    * Returns an array of date strings for today and past 6 days.
    * Format: YYYY-MM-DD
*/
export function getPast7Days() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        days.push(dayjs().subtract(i, "day").format("YYYY-MM-DD"));
    }
    return days;
};
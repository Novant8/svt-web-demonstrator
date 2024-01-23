import dayjs from "dayjs";

/**
 * @returns {string} - Today's date in YYYY-MM-DD
 */
export const TODAY = () => dayjs().format("YYYY-MM-DD");

/**
 * Converts a date from any format to a long format.
 * @param {string} date - Date in any format (e.g. 2023-06-26)
 * @returns {string}    - Date in a long format (e.g. June 26, 2023)
 */
export const longDate = (date) => dayjs(date).format("MMMM D, YYYY")
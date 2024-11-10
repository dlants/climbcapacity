export const mean = (nums: number[]): number =>
    nums.reduce((sum, n) => sum + n, 0) / nums.length;

export const min = (nums: number[]): number => Math.min(...nums);

export const max = (nums: number[]): number => Math.max(...nums);

export const stdDev = (nums: number[]): number => {
    const avg = mean(nums);
    const squareDiffs = nums.map(n => Math.pow(n - avg, 2));
    return Math.sqrt(mean(squareDiffs));
};

export const filterOutliers = (nums: number[]): number[] => {
    const avg = mean(nums);
    const sd = stdDev(nums);
    return nums.filter(n => Math.abs(n - avg) <= 2 * sd);
};

export type Point = {x: number, y: number};

export const stdDevX = (points: Point[]): number => {
    const avgX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const squareDiffs = points.map(p => Math.pow(p.x - avgX, 2));
    return Math.sqrt(squareDiffs.reduce((sum, d) => sum + d, 0) / points.length);
};

export const filterOutliersX = (points: Point[]): Point[] => {
    const avgX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const sd = stdDevX(points);
    return points.filter(p => Math.abs(p.x - avgX) <= 2 * sd);
};

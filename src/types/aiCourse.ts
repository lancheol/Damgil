export type AiCourseTransport = '승용차' | '대중교통' | '도보';

export type AiCourseStop = {
  id: string;
  /** 10:00 형태 */
  time: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
};

export type AiCourseDay = {
  day: number;
  title: string;
  stops: AiCourseStop[];
};

export type AiCourse = {
  id: string;
  title: string;
  tags: string[];
  /** 2026.09.12 형태 */
  startDate: string;
  transport: AiCourseTransport;
  days: AiCourseDay[];
};

export type CreateAiCourseInput = {
  destination: string;
  schedule: string;
  transport: AiCourseTransport;
  places: string[];
};

export function countCourseStops(course: AiCourse): number {
  return course.days.reduce((total, day) => total + day.stops.length, 0);
}

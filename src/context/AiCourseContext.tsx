import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';

import { AI_COURSES } from '../constants/aiCourses';
import { AiCourse } from '../types/aiCourse';

type AiCourseContextValue = {
  courses: AiCourse[];
  saveCourse: (course: AiCourse) => void;
  deleteCourse: (courseId: string) => void;
};

const AiCourseContext = createContext<AiCourseContextValue | null>(null);

export function AiCourseProvider({ children }: PropsWithChildren) {
  const [courses, setCourses] = useState<AiCourse[]>(AI_COURSES);

  const saveCourse = useCallback((course: AiCourse) => {
    setCourses((prev) => {
      if (prev.some((item) => item.id === course.id)) {
        return prev.map((item) => (item.id === course.id ? course : item));
      }
      return [course, ...prev];
    });
  }, []);

  const deleteCourse = useCallback((courseId: string) => {
    setCourses((prev) => prev.filter((course) => course.id !== courseId));
  }, []);

  const value = useMemo(
    () => ({ courses, saveCourse, deleteCourse }),
    [courses, saveCourse, deleteCourse],
  );

  return <AiCourseContext.Provider value={value}>{children}</AiCourseContext.Provider>;
}

export function useAiCourses(): AiCourseContextValue {
  const context = useContext(AiCourseContext);
  if (!context) {
    throw new Error('useAiCourses는 AiCourseProvider 안에서만 사용할 수 있어요.');
  }
  return context;
}

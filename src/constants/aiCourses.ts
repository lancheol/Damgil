import { AiCourse, AiCourseTransport } from '../types/aiCourse';

export const AI_COURSE_TRANSPORTS: AiCourseTransport[] = ['자차', '대중교통'];

/** 코스 생성 API 연동 전 사용하는 임시 목록 */
export const AI_COURSES: AiCourse[] = [
  {
    id: 'course-01',
    title: '제주도 3박 4일 감성 카페 투어',
    tags: ['#제주', '#카페', '#휴양'],
    startDate: '2026.09.12',
    transport: '자차',
    days: [
      {
        day: 1,
        title: '공항 도착 및 시내 투어',
        stops: [
          {
            id: 'c1-d1-s1',
            time: '10:00',
            name: '제주국제공항',
            description: '렌터카 수령하기',
            latitude: 33.5104,
            longitude: 126.4914,
          },
          {
            id: 'c1-d1-s2',
            time: '11:30',
            name: '우진해장국',
            description: '점심 식사 (음식점)',
            latitude: 33.5127,
            longitude: 126.5219,
          },
          {
            id: 'c1-d1-s3',
            time: '14:00',
            name: '용두암 해안도로',
            description: '드라이브 및 바다 감상',
            latitude: 33.5152,
            longitude: 126.5122,
          },
        ],
      },
      {
        day: 2,
        title: '서쪽 힐링 자연 탐방',
        stops: [
          {
            id: 'c1-d2-s1',
            time: '10:00',
            name: '오설록 티 뮤지엄',
            description: '녹차밭 산책 및 디저트',
            latitude: 33.3057,
            longitude: 126.2896,
          },
          {
            id: 'c1-d2-s2',
            time: '13:30',
            name: '협재 해수욕장',
            description: '아름다운 에메랄드빛 바다',
            latitude: 33.3939,
            longitude: 126.2396,
          },
        ],
      },
      {
        day: 3,
        title: '동쪽 감성 카페 코스',
        stops: [
          {
            id: 'c1-d3-s1',
            time: '11:00',
            name: '성산일출봉',
            description: '오전 트레킹',
            latitude: 33.4581,
            longitude: 126.9425,
          },
          {
            id: 'c1-d3-s2',
            time: '14:30',
            name: '카페 그곶',
            description: '바다 뷰 카페에서 휴식',
            latitude: 33.4406,
            longitude: 126.9187,
          },
        ],
      },
    ],
  },
  {
    id: 'course-02',
    title: '강릉 1박 2일 식도락 여행',
    tags: ['#강원도', '#맛집', '#친구와'],
    startDate: '2026.08.20',
    transport: '자차',
    days: [
      {
        day: 1,
        title: '바다 보며 시작하는 하루',
        stops: [
          {
            id: 'c2-d1-s1',
            time: '11:00',
            name: '초당순두부마을',
            description: '점심 식사 (음식점)',
            latitude: 37.7959,
            longitude: 128.9096,
          },
          {
            id: 'c2-d1-s2',
            time: '14:00',
            name: '안목해변 카페거리',
            description: '바다 뷰 카페 투어',
            latitude: 37.7714,
            longitude: 128.9476,
          },
        ],
      },
      {
        day: 2,
        title: '강릉 시내 한 바퀴',
        stops: [
          {
            id: 'c2-d2-s1',
            time: '10:00',
            name: '오죽헌',
            description: '아침 산책 및 관람',
            latitude: 37.7796,
            longitude: 128.8784,
          },
          {
            id: 'c2-d2-s2',
            time: '12:30',
            name: '강릉중앙시장',
            description: '먹거리 투어',
            latitude: 37.7519,
            longitude: 128.8965,
          },
        ],
      },
    ],
  },
  {
    id: 'course-03',
    title: '부산 해운대 뚜벅이 당일치기',
    tags: ['#부산', '#뚜벅이', '#당일치기'],
    startDate: '2026.07.10',
    transport: '대중교통',
    days: [
      {
        day: 1,
        title: '해운대에서 광안리까지',
        stops: [
          {
            id: 'c3-d1-s1',
            time: '10:00',
            name: '해운대 해수욕장',
            description: '해변 산책',
            latitude: 35.1587,
            longitude: 129.1604,
          },
          {
            id: 'c3-d1-s2',
            time: '13:00',
            name: '동백섬',
            description: '누리마루 둘러보기',
            latitude: 35.1531,
            longitude: 129.1524,
          },
          {
            id: 'c3-d1-s3',
            time: '17:00',
            name: '광안리 해수욕장',
            description: '광안대교 야경 감상',
            latitude: 35.1532,
            longitude: 129.1188,
          },
        ],
      },
    ],
  },
];

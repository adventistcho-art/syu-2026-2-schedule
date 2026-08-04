import { z } from "zod";

export const eventCategorySchema = z.enum([
  "ACADEMIC",
  "CHAPEL",
  "STUDENT",
  "ADMISSION",
  "DEPT",
  "HOLIDAY",
]);

export const createEventSchema = z
  .object({
    title: z.string().min(1, "일정명을 입력하세요"),
    category: eventCategorySchema,
    dept: z.string().min(1, "부서를 입력하세요"),
    startDate: z.string().min(1, "시작일을 입력하세요"),
    endDate: z.string().min(1, "종료일을 입력하세요"),
    location: z.string().optional(),
    description: z.string().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "종료일은 시작일 이후여야 합니다",
    path: ["endDate"],
  });

export type CreateEventInput = z.infer<typeof createEventSchema>;

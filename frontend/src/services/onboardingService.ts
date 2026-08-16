import api from "./api";

export type TourAction =
  | "started"
  | "step_viewed"
  | "page_opened"
  | "completed"
  | "skipped"
  | "dismissed"
  | "dont_show_again";

export type TourProgress = {
  id: string;
  userId: string;
  tourKey: string;
  tourVersion: string;
  roleName: string;
  startedAt?: string | null;
  completedAt?: string | null;
  skippedAt?: string | null;
  dismissedAt?: string | null;
  lastSeenAt?: string | null;
  lastStepIndex: number;
  totalSteps: number;
  viewCount: number;
  completedCount: number;
  skippedCount: number;
  lastAction?: string | null;
  lastPath?: string | null;
  deviceType?: string | null;
};

type TourStatusResponse = {
  progress: TourProgress | null;
  shouldShow: boolean;
};

type TourEventPayload = {
  tourKey: string;
  tourVersion: string;
  roleName: string;
  action: TourAction;
  stepIndex: number;
  totalSteps: number;
  path?: string;
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
};

export async function getTourStatus(tourKey: string, tourVersion: string) {
  const response = await api.get<{ data: TourStatusResponse }>(
    `/onboarding/tours/${tourKey}/status`,
    { params: { tourVersion } }
  );

  return response.data.data;
}

export async function recordTourEvent(payload: TourEventPayload) {
  const response = await api.post<{ data: TourStatusResponse }>(
    "/onboarding/tours/events",
    payload
  );

  return response.data.data;
}

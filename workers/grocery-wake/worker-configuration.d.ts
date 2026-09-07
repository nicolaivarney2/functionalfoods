interface ScheduledController {
  readonly scheduledTime: number
  readonly cron: string
  noRetry(): void
}

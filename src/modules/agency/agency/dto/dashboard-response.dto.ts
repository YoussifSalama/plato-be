import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class DashboardMetricsDto {
    @ApiProperty()
    activeJobs: number;

    @ApiProperty()
    totalCandidates: number;

    @ApiProperty()
    upcomingInterviews: number;

    @ApiProperty()
    unreadMessages: number;
}

class TrendValueDto {
    @ApiProperty()
    value: number;

    @ApiProperty()
    trend: number;
}

class DashboardOverviewDto {
    @ApiProperty({ type: TrendValueDto })
    totalJobs: TrendValueDto;

    @ApiProperty({ type: TrendValueDto })
    newApplicants: TrendValueDto;

    @ApiProperty({ type: TrendValueDto })
    interviewsScheduled: TrendValueDto;

    @ApiProperty({ type: TrendValueDto })
    hiringSuccessRate: TrendValueDto;
}

class WeeklyActivityDto {
    @ApiProperty()
    day: string;

    @ApiProperty()
    applications: number;

    @ApiProperty()
    interviews: number;
}

class InterviewStatusDto {
    @ApiProperty()
    stage: string;

    @ApiProperty()
    value: number;
}

class DepartmentProgressDto {
    @ApiProperty()
    department: string;

    @ApiProperty()
    currentHired: number;

    @ApiProperty()
    targetHires: number;
}

class MonthlyGrowthChartDataDto {
    @ApiProperty()
    month: string;

    @ApiProperty()
    applications: number;
}

class MonthlyGrowthCurrentMonthDto {
    @ApiProperty()
    total: number;

    @ApiProperty()
    trend: number;
}

class MonthlyGrowthDto {
    @ApiProperty({ type: [MonthlyGrowthChartDataDto] })
    chartData: MonthlyGrowthChartDataDto[];

    @ApiProperty({ type: MonthlyGrowthCurrentMonthDto })
    currentMonth: MonthlyGrowthCurrentMonthDto;
}

class RecentActivityDto {
    @ApiProperty()
    id: string;

    @ApiProperty({ enum: ['application', 'interview', 'job', 'offer', 'message'] })
    type: 'application' | 'interview' | 'job' | 'offer' | 'message';

    @ApiProperty()
    title: string;

    @ApiPropertyOptional()
    description?: string;

    @ApiProperty()
    timestamp: string;
}

export class DashboardSummaryResponseDto {
    @ApiProperty({ type: DashboardMetricsDto })
    metrics: DashboardMetricsDto;

    @ApiProperty({ type: DashboardOverviewDto })
    overview: DashboardOverviewDto;

    @ApiProperty({ type: [WeeklyActivityDto] })
    weeklyActivity: WeeklyActivityDto[];

    @ApiProperty({ type: [InterviewStatusDto] })
    applicationStatus: InterviewStatusDto[];

    @ApiProperty({ type: [DepartmentProgressDto] })
    departmentProgress: DepartmentProgressDto[];

    @ApiProperty({ type: MonthlyGrowthDto })
    monthlyGrowth: MonthlyGrowthDto;

    @ApiProperty({ type: [RecentActivityDto] })
    recentActivities: RecentActivityDto[];
}


'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Trophy, Gamepad2, UserCheck, AreaChart as AreaChartIcon } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const kpiData = [
    { title: 'Total Users', value: '1,250', icon: Users, change: '+12.5%' },
    { title: 'Total Tournaments', value: '82', icon: Trophy, change: '+5' },
    { title: 'Matches Played', value: '1,421', icon: Gamepad2, change: '+50 this week' },
    { title: 'Active Today', value: '189', icon: UserCheck, change: '-3%' },
];

const chartData = [
  { month: "January", desktop: 186 },
  { month: "February", desktop: 305 },
  { month: "March", desktop: 237 },
  { month: "April", desktop: 73 },
  { month: "May", desktop: 209 },
  { month: "June", desktop: 214 },
];

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "hsl(var(--primary))",
  },
};

const recentApprovals = [
    { id: 'T7', name: 'Summer Smash 2024', owner: 'john.doe@example.com', status: 'pending' },
    { id: 'U5', name: 'Jane Smith', owner: 'jane.smith@example.com', status: 'approved' },
    { id: 'T8', name: 'Winter Cup', owner: 'sam.wilson@example.com', status: 'pending' },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, Admin!</h1>
        <p className="text-gray-500">Here's a snapshot of your platform's activity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((item) => (
          <Card key={item.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <item.icon className="h-5 w-5 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{item.value}</div>
              <p className="text-xs text-gray-500">{item.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
            <CardDescription>Monthly active users trend.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
             <ChartContainer config={chartConfig}>
              <AreaChart
                accessibilityLayer
                data={chartData}
                margin={{
                  left: 12,
                  right: 12,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Area
                  dataKey="desktop"
                  type="natural"
                  fill="var(--color-desktop)"
                  fillOpacity={0.4}
                  stroke="var(--color-desktop)"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Approvals</CardTitle>
            <CardDescription>Tournaments awaiting your review.</CardDescription>
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {recentApprovals.map(item => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>
                                <Badge variant={item.status === 'pending' ? 'destructive' : 'default'}>{item.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="outline" size="sm">View</Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

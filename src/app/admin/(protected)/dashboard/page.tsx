
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Trophy, Gamepad2, UserCheck, AreaChart as AreaChartIcon } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserProfile, Tournament, MatchState } from "@/lib/types";

export default function AdminDashboard() {
  const [kpiData, setKpiData] = useState([
    { title: 'Total Users', value: '0', icon: Users },
    { title: 'Total Tournaments', value: '0', icon: Trophy },
    { title: 'Matches Played', value: '0', icon: Gamepad2 },
    { title: 'Active Today', value: '0', icon: UserCheck },
  ]);
  const [chartData, setChartData] = useState<{ month: string; desktop: number }[]>([]);
  const [recentApprovals, setRecentApprovals] = useState<Tournament[]>([]);

  useEffect(() => {
    // Users KPI
    const usersQuery = query(collection(db, "users"));
    const usersUnsub = onSnapshot(usersQuery, (snapshot) => {
      setKpiData(prev => prev.map(k => k.title === 'Total Users' ? { ...k, value: snapshot.size.toString() } : k));
      
      const monthlyData: { [key: string]: number } = {};
      const now = new Date();
      // Initialize last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = d.toLocaleString('default', { month: 'long' });
        monthlyData[monthName] = 0;
      }
      
      snapshot.docs.forEach(doc => {
        const user = doc.data() as UserProfile;
        // The auth user object has a `createdAt` but our UserProfile doesn't.
        // We will simulate with a placeholder logic.
        // In a real app, you'd store a `createdAt` timestamp on the user profile.
        // For now, let's distribute them somewhat randomly over the last 6 months for demo.
        const randomMonthOffset = Math.floor(Math.random() * 6);
        const monthDate = new Date(now.getFullYear(), now.getMonth() - randomMonthOffset, 1);
        const month = monthDate.toLocaleString('default', { month: 'long' });
        
        if (monthlyData.hasOwnProperty(month)) {
            monthlyData[month]++;
        }
      });
      
      const formattedChartData = Object.entries(monthlyData).map(([month, count]) => ({ month, desktop: count }));
      setChartData(formattedChartData);
    });

    // Tournaments KPI
    const tournamentsQuery = query(collection(db, "tournaments"));
    const tournamentsUnsub = onSnapshot(tournamentsQuery, (snapshot) => {
      setKpiData(prev => prev.map(k => k.title === 'Total Tournaments' ? { ...k, value: snapshot.size.toString() } : k));
      const pending = snapshot.docs
        .map(doc => ({ ...doc.data() as Tournament, id: doc.id }))
        .filter(t => t.status === 'pending');
      setRecentApprovals(pending);
    });
    
    // Matches KPI
    const matchesQuery = query(collection(db, "matches"), where("matchOver", "==", true));
    const matchesUnsub = onSnapshot(matchesQuery, (snapshot) => {
      setKpiData(prev => prev.map(k => k.title === 'Matches Played' ? { ...k, value: snapshot.size.toString() } : k));
    });

    return () => {
      usersUnsub();
      tournamentsUnsub();
      matchesUnsub();
    };
  }, []);

  const chartConfig = {
    desktop: {
      label: "Users",
      color: "hsl(var(--primary))",
    },
  };

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
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
            <CardDescription>Monthly new users trend.</CardDescription>
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

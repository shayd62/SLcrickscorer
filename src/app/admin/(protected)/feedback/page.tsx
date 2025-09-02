
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Feedback } from "@/lib/types";
import { formatDistanceToNow } from 'date-fns';

export default function AdminFeedbackPage() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "feedback"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const feedbacks = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Feedback));
      setFeedbackList(feedbacks);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching feedback: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Feedback</CardTitle>
        <CardDescription>All feedback submissions from users are listed here.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Loading feedback...</p>
        ) : feedbackList.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No feedback submitted yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Feedback</TableHead>
                <TableHead className="text-right">Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedbackList.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.userEmail || 'Anonymous'}</div>
                    <div className="text-sm text-gray-500">{item.userId || ''}</div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="whitespace-pre-wrap">{item.feedback}</p>
                  </TableCell>
                  <TableCell className="text-right">{formatTimestamp(item.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

import React, { useEffect, useState } from "react";
import { Box, Text, render } from "ink";
import type { AnalyticsService } from "../application/analytics-service.js";
import type { UsageSummary } from "../domain/types.js";
import { formatCost, formatNumber } from "./format.js";

type MonitorProps = {
  analytics: AnalyticsService;
};

export function Monitor({ analytics }: MonitorProps) {
  const [summary, setSummary] = useState<UsageSummary | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const current = await analytics.currentSession();
      if (mounted) {
        setSummary(current);
      }
    };

    void load();
    const timer = setInterval(() => void load(), 1000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [analytics]);

  const data = summary ?? {
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
    totalTokens: 0,
    cost: 0,
    requests: 0,
    sessions: 0,
    projects: 0
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Current Session</Text>
      <Text>Input Tokens:  {formatNumber(data.inputTokens)}</Text>
      <Text>Output Tokens: {formatNumber(data.outputTokens)}</Text>
      <Text>Cached Tokens: {formatNumber(data.cachedTokens)}</Text>
      <Text>Total:         {formatNumber(data.totalTokens)}</Text>
      <Text>Requests:      {formatNumber(data.requests)}</Text>
      <Text>Cost:          {formatCost(data.cost)}</Text>
      <Text dimColor>Refreshes every second. Press Ctrl+C to exit.</Text>
    </Box>
  );
}

export function renderMonitor(analytics: AnalyticsService) {
  return render(<Monitor analytics={analytics} />);
}

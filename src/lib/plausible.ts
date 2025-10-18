/**
 * Plausible Analytics event tracking utilities
 * Use these functions to track custom events and goals
 * Requires @plausible-analytics/tracker to be initialized
 */

import { track } from "@plausible-analytics/tracker";

/**
 * Track a custom event in Plausible
 * @param eventName - The name of the event (e.g., "Download", "Signup")
 * @param props - Optional custom properties to track with the event
 */
export function trackEvent(eventName: string, props?: Record<string, string>): void {
  track(eventName, { props });
}

/**
 * Track a goal completion
 * @param goalName - The name of the goal (must match your Plausible dashboard)
 */
export function trackGoal(goalName: string): void {
  trackEvent(goalName);
}

/**
 * Track an outbound link click
 * @param url - The external URL being clicked
 */
export function trackOutboundLink(url: string): void {
  trackEvent("Outbound Link", { url });
}

/**
 * Track a file download
 * @param fileName - The name of the file being downloaded
 * @param fileType - The type/extension of the file (e.g., "pdf", "zip")
 */
export function trackDownload(fileName: string, fileType: string): void {
  trackEvent("Download", { file_name: fileName, file_type: fileType });
}

/**
 * Track when a user scrolls to a specific section
 * @param sectionName - The name of the section
 */
export function trackSectionView(sectionName: string): void {
  trackEvent("Section View", { section: sectionName });
}

/**
 * Track a search query
 * @param query - The search query
 * @param resultsCount - Optional number of results found
 */
export function trackSearch(query: string, resultsCount?: number): void {
  const props: Record<string, string> = { query };
  if (resultsCount !== undefined) {
    props.results_count = resultsCount.toString();
  }
  trackEvent("Search", props);
}


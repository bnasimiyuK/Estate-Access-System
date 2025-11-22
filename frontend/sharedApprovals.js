// sharedApprovals.js
export let pendingApprovals = [
  { visitor: "Alice", resident: "John Doe", house: "A1", date: "2025-11-13", L1: "Pending", L2: "Pending" },
  { visitor: "Bob", resident: "Jane Smith", house: "B2", date: "2025-11-14", L1: "Approved", L2: "Pending" },
  { visitor: "Charlie", resident: "Mary Poppins", house: "C3", date: "2025-11-15", L1: "Pending", L2: "Pending" }
];

// Utility function to update L1 or L2 approvals
export function approve(index, level) {
  if (level === 'L1') pendingApprovals[index].L1 = 'Approved';
  if (level === 'L2') pendingApprovals[index].L2 = 'Approved';
}

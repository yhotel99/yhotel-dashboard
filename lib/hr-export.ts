const escapeCSVValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  const stringValue = String(value).replace(/,/g, ";").replace(/"/g, '""');
  if (
    stringValue.includes(";") ||
    stringValue.includes("\n") ||
    stringValue.includes('"')
  ) {
    return `"${stringValue}"`;
  }
  return stringValue;
};

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) {
    alert("Không có dữ liệu để xuất");
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers.map((header) => escapeCSVValue(row[header])).join(",")
    ),
  ].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

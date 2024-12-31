"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [responses, setResponses] = useState<{ email: string; address?: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;

    setLoading(true);
    setResponses([]);

    const reader = new FileReader();

    reader.onload = async (e) => {
      const data = e.target?.result;
      if (!data) return;

      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<{ email: string }>(sheet);

      const tempResponses: { email: string; address?: string }[] = [];

      for (let row of rows) {
        const email = row.email?.trim();
        if (email) {
          try {
            const response = await fetch("/api/getWallet", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ email }),
            });

            const data = await response.json();
            tempResponses.push({ email, address: data.wallet });
          } catch (error) {
            console.error(`Failed to fetch data for ${email}`, error);
            tempResponses.push({ email, address: "Error fetching address" });
          }
        }
      }

      setResponses(tempResponses);
      setLoading(false);

      generateXLSX(tempResponses);
    };

    reader.onerror = () => {
      console.error("Failed to read the file");
      setLoading(false);
    };

    reader.readAsBinaryString(file);
  };

  const generateXLSX = (data: { email: string; address?: string }[]) => {
    const worksheet = XLSX.utils.json_to_sheet(data, { header: ["email", "address"] });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Responses");

    const xlsxBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([xlsxBuffer], { type: "application/octet-stream" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "responses.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Pregenerate in-app wallets</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        {!file ? (
          <>
            <label htmlFor="file-input" style={styles.fileButton}>
              Choose File
            </label>
            <input
              id="file-input"
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              style={styles.hiddenInput}
            />
          </>
        ) : (
          <div style={styles.fileDisplay}>
            <span style={styles.fileName}>{file.name}</span>
            <button type="button" onClick={handleRemoveFile} style={styles.removeButton}>
              Remove File
            </button>
          </div>
        )}
        <button type="submit" style={styles.submitButton} disabled={!file || loading}>
          {loading ? "Processing..." : "Execute"}
        </button>
      </form>
      {loading && <div style={styles.spinner}>Loading...</div>}
      {responses.length > 0 && (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.tableHeader}>Email</th>
              <th style={styles.tableHeader}>Address</th>
            </tr>
          </thead>
          <tbody>
            {responses.map((response, index) => (
              <tr key={index} style={styles.tableRow}>
                <td style={styles.tableCell}>{response.email}</td>
                <td style={styles.tableCell}>{response.address || "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const styles = {
  container: {
    fontFamily: "'Arial', sans-serif",
    maxWidth: "800px",
    margin: "0 auto",
    padding: "20px",
    backgroundColor: "#000",
    color: "#fff",
    textAlign: "center" as const,
    borderRadius: "10px",
    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)",
  },
  heading: {
    fontSize: "28px",
    marginBottom: "20px",
    fontWeight: "bold",
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "10px",
    marginBottom: "20px",
  },
  hiddenInput: {
    display: "none",
  },
  fileButton: {
    padding: "10px 20px",
    fontSize: "16px",
    backgroundColor: "#444",
    color: "#fff",
    border: "1px solid #555",
    borderRadius: "5px",
    cursor: "pointer",
    transition: "background-color 0.3s",
  },
  fileDisplay: {
    display: "flex",
    flexDirection: "row" as const,
    alignItems: "center",
    gap: "10px",
  },
  fileName: {
    fontSize: "14px",
    color: "#aaa",
  },
  removeButton: {
    padding: "5px 10px",
    fontSize: "14px",
    backgroundColor: "#ff5555",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  submitButton: {
    padding: "10px 20px",
    fontSize: "16px",
    backgroundColor: "#444",
    color: "#fff",
    border: "1px solid #555",
    borderRadius: "5px",
    cursor: "pointer",
    transition: "background-color 0.3s",
    opacity: (enabled: boolean) => (enabled ? 1 : 0.5),
  },
  spinner: {
    marginTop: "20px",
    fontSize: "18px",
    fontWeight: "bold",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    marginTop: "20px",
  },
  tableHeader: {
    backgroundColor: "#444",
    color: "#fff",
    fontWeight: "bold",
    padding: "10px",
    borderBottom: "2px solid #555",
  },
  tableRow: {
    backgroundColor: "#222",
    color: "#fff",
  },
  tableCell: {
    padding: "10px",
    borderBottom: "1px solid #555",
  },
};
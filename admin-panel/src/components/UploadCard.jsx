import { useRef, useState } from "react";
import { uploadPdf } from "../api";

const MAX_SIZE = 20 * 1024 * 1024; // same limit as the server

const formatSize = bytes =>
  bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export default function UploadCard({ password, onUnauthorized }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const inputRef = useRef(null);

  function pick(f) {
    setError("");
    setSummary(null);
    if (!f) return;
    if (f.type !== "application/pdf") return setError("Only PDF files are allowed.");
    if (f.size > MAX_SIZE) return setError("File is too large. Maximum size is 20 MB.");
    setFile(f);
  }

  async function upload() {
    setUploading(true);
    setError("");
    try {
      const result = await uploadPdf(file, password);
      setSummary(result);
      setFile(null);
    } catch (err) {
      if (err.status === 401) return onUnauthorized(); // password changed on the server
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-6">
      <h2 className="text-base font-semibold">Upload timetable</h2>
      <p className="mt-1 text-sm text-slate-600">
        Choose the timetable PDF (max 20 MB). It will replace the current timetable. Put the version in the
        file name, e.g. <span className="font-medium">Timetable V#5.pdf</span>, and the app will show it.
      </p>

      {/* file row: click "Choose PDF" or drop a file on it */}
      <div
        onDragOver={e => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files[0]);
        }}
        className={`mt-4 flex items-center gap-3 rounded-md border p-3 ${
          dragging ? "border-green-600 bg-green-50" : "border-slate-300"
        }`}
      >
        <button
          type="button"
          onClick={() => inputRef.current.click()}
          disabled={uploading}
          className="shrink-0 rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
        >
          Choose PDF
        </button>
        <span className="min-w-0 flex-1 truncate text-sm text-slate-600">
          {file ? `${file.name} (${formatSize(file.size)})` : "No file chosen"}
        </span>
        {file && !uploading && (
          <button onClick={() => setFile(null)} className="shrink-0 text-sm text-slate-500 hover:text-slate-800">
            Remove
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={e => {
            pick(e.target.files[0]);
            e.target.value = ""; // allow choosing the same file again
          }}
        />
      </div>

      <button
        onClick={upload}
        disabled={!file || uploading}
        className="mt-4 rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {uploading ? "Uploading…" : "Upload"}
      </button>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {summary && (
        <p className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Timetable updated{summary.version && ` (${summary.version})`}: {summary.sections} sections,{" "}
          {summary.entries} classes
          {summary.warnings.length > 0 && `, ${summary.warnings.length} warnings`}.
        </p>
      )}
    </section>
  );
}

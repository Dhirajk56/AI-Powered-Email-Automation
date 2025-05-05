import React, { useState } from "react";
import Papa from "papaparse";
import axios from "axios";

export default function App() {
  const [csvData, setCsvData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState([]);
  const [previewStates, setPreviewStates] = useState({}); // preview mode per email index

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          setCsvData(results.data);
          alert("CSV loaded successfully");
        },
      });
    }
  };

  //generate invitation for all
  const generateInvitations = async () => {
    if (!csvData.length) {
      alert("Please upload a CSV file first.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(
        "http://localhost:5000/api/generate-invitations",
        { guests: csvData }
      );
      setEmails(res.data.invitations || []);
    } catch (error) {
      console.error(error);
      alert("Failed to generate invitations.");
    } finally {
      setLoading(false);
    }
  };

  const handleContentChange = (index, newContent) => {
    setEmails((prev) => {
      const updated = [...prev];
      updated[index].content = newContent;
      return updated;
    });
  };
  //Send email individually
  const handleSendEmail = async (email) => {
    try {
      await axios.post("http://localhost:5000/api/send-final-email", {
        name: email.name,
        email: email.email,
        content: email.content,
      });
      alert(`Email sent to ${email.name}`);
    } catch (error) {
      console.error(error);
      alert("Failed to send email.");
    }
  };
  //Sending email to all
  const HandleAllEmail = async () => {
    if (!emails.length) return alert("No emails to send.");

    const confirmed = window.confirm(
      "Are you sure you want to send all emails?"
    );
    if (!confirmed) return;

    try {
      for (const email of emails) {
        await axios.post("http://localhost:5000/api/send-final-email", {
          name: email.name,
          email: email.email,
          content: email.content,
        });
      }
      alert("All emails have been sent successfully.");
    } catch (error) {
      console.error(error);
      alert("Failed to send one or more emails.");
    }
  };

  const togglePreview = (index) => {
    setPreviewStates((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">VBDA AI Invitation Tool</h1>

      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="mb-4 border p-1 rounded mr-2 hover:bg-gray-200"
      />

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 mb-6 font-semibold"
        onClick={generateInvitations}
        disabled={loading}
      >
        {loading ? "Generating..." : "Generate Invitations"}
      </button>

      <button
        className="bg-yellow-400 px-4 py-2 rounded font-semibold border-1 hover:bg-yellow-500 ml-1 text-white"
        onClick={HandleAllEmail}
      >
        Send To All
      </button>

      {emails.map((val, index) => (
        <div
          key={index}
          className="mb-6 p-4 border border-gray-300 rounded shadow-sm bg-gray-50"
        >
          <p className="font-semibold mb-2">
            To: {val.name} ({val.email})
          </p>

          <button
            className="bg-yellow-500 text-white px-2 py-1 rounded mb-2"
            onClick={() => togglePreview(index)}
          >
            {previewStates[index] ? "Edit ✏️" : "Preview 👀"}
          </button>

          {previewStates[index] ? (
            <div className="bg-white p-3 border rounded whitespace-pre-wrap">
              {val.content}
            </div>
          ) : (
            <textarea
              className="w-full p-2 border rounded resize-y min-h-[150px]"
              value={val.content}
              onChange={(e) => handleContentChange(index, e.target.value)}
            />
          )}

          <button
            onClick={() => handleSendEmail(val)}
            className="mt-2 bg-green-600 text-white px-4 py-1 rounded"
          >
            Send Email
          </button>
        </div>
      ))}
    </div>
  );
}

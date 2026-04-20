import React, { useState } from "react";
import axios from "axios";
import "./App.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://hoa-backend-rnhi.onrender.com";

function App() {
  const [rulesFile, setRulesFile] = useState(null);
  const [rulesText, setRulesText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [rulesStatus, setRulesStatus] = useState("");
  const [openAIResult, setOpenAIResult] = useState(null);
  const [visionResult, setVisionResult] = useState(null);
  const [loadingRules, setLoadingRules] = useState(false);
  const [loadingOpenAI, setLoadingOpenAI] = useState(false);
  const [loadingVision, setLoadingVision] = useState(false);

console.log("BACKEND_URL:", BACKEND_URL);

  const uploadRules = async () => {
    if (!rulesFile) return;

    const formData = new FormData();
    formData.append("rules", rulesFile);

    setLoadingRules(true);
    setRulesStatus("");

    const uploadRulesUrl = `${BACKEND_URL}/api/upload-rules`;

    try {
      const res = await axios.post(uploadRulesUrl, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setRulesText(res.data.text);
      setRulesStatus(`Rules uploaded: (${res.data.chars} characters).`);
    } catch (err) {
      console.error(err);
      setRulesStatus("your rules aren't uploading :(");
    } finally {
      setLoadingRules(false);
    }
  };

  const analyzeOpenAI = async () => {
    if (!imageFile) return;

    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("rulesText", rulesText);

    setLoadingOpenAI(true);
    setOpenAIResult(null);

    try {
      const res = await axios.post(`${BACKEND_URL}/api/analyze-openai`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setOpenAIResult(res.data);
    } catch (err) {
      console.error(err);
      setOpenAIResult({ error: err.response?.data?.error || "something went wrong. you could try again, or not" });
    } finally {
      setLoadingOpenAI(false);
    }
  };

  const analyzeVision = async () => {
    if (!imageFile) return;

    const formData = new FormData();
    formData.append("image", imageFile);

    setLoadingVision(true);
    setVisionResult(null);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/analyze-vision`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setVisionResult(res.data);
    } catch (err) {
      console.error(err);
      setVisionResult({ error: "labels failed. it's alright, they didn't do anything anyways" });
    } finally {
      setLoadingVision(false);
    }
  };

  function renderOpenAIResult(res) {
    if (!res) return <div>waiting for you...</div>;

    if (res.raw) {
      try {
        const parsed = JSON.parse(res.raw);
        return Object.entries(parsed).map(([k,v]) => (
          <div key={k} style={{marginBottom:8}}>
            <strong>{k}:</strong>
            <div style={{marginLeft:8, whiteSpace:"pre-wrap"}}>
              {typeof v === "string" ? v : JSON.stringify(v, null, 2)}
            </div>
          </div>
        ));
      } catch (e) {
        return res.raw.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>);
      }
    }

    if (typeof res === "string") {
      return res.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>);
    }

    if (res.sections && Array.isArray(res.sections)) {
      return res.sections.map((s, idx) => (
        <section key={idx} style={{ marginBottom: 12 }}>
          {s.title && <strong style={{display:"block", marginBottom:6}}>{s.title}</strong>}
          {s.text && <p style={{margin:"6px 0"}}>{s.text}</p>}
          {s.items && Array.isArray(s.items) && (
            <ul>{s.items.map((it,i)=>(<li key={i}>{it}</li>))}</ul>
          )}
        </section>
      ));
    }

    return Object.entries(res).map(([k,v]) => (
      <div key={k} style={{marginBottom:8}}>
        <strong>{k}:</strong>
        <div style={{marginLeft:8, whiteSpace:"pre-wrap"}}>
          {typeof v === "string" ? v : JSON.stringify(v, null, 2)}
        </div>
      </div>
    ));
  }

  return (
    <div className="app-root">
      <header className="hero">
        <h1>VergeAI</h1>
        <p className="tagline">
          Upload your HOA rule document and a property photo to check compliance.
        </p>
      </header>

      <main className="container">
        <div className="card controls">
          <h3>1. Upload HOA Rules</h3>

          <div className="field">
            <input
              type="file"
              accept=".pdf,.txt,.doc,.docx"
              onChange={(e) => setRulesFile(e.target.files[0])}
            />
          </div>

          <div className="field">
            <button className="btn" onClick={uploadRules} disabled={loadingRules || !rulesFile}>
              {loadingRules ? "Uploading..." : "Upload Rules"}
            </button>
          </div>

          {rulesStatus && <p className="muted">{rulesStatus}</p>}

          <hr style={{ margin: "16px 0" }} />

          <h3>2. Upload Property Photo</h3>

          <div className="field">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
            />
          </div>

          {imageFile && (
            <div className="field">
              <img
                src={URL.createObjectURL(imageFile)}
                alt="Uploaded property"
                style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
              />
            </div>
          )}

          <div className="field btn-group">
            <button className="btn" onClick={analyzeOpenAI} disabled={loadingOpenAI || !imageFile || !rulesText}>
              {loadingOpenAI ? "your grass looks real nice..." : "Analyze!"}
            </button>

            <button className="btn secondary" onClick={analyzeVision} disabled={loadingVision || !imageFile}>
              {loadingVision ? "Counting bushes..." : "Label (for fun)"}
            </button>
          </div>
        </div>

        <div>
          <div className="card results openai-result" style={{ marginBottom: 16 }}>
            <h3>Analysis Result</h3>
            <div>{renderOpenAIResult(openAIResult)}</div>
          </div>

          <div className="card results">
            <h3>Cloud Vision Labels</h3>
            <pre>
              {visionResult ? JSON.stringify(visionResult, null, 2) : "in deep thought."}
            </pre>
          </div>
        </div>
      </main>

      <footer className="footer">
        *Please only use this as a reference, not a legal document. We are not regulated by your HOA.
      </footer>
    </div>
  );
}

export default App;
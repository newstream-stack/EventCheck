import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import api from '../api/client';
import Layout from '../components/Layout';
import './Scanner.css';

const RESULT_DISPLAY_MS = 4000;
// Prevent the same token from being re-scanned within this window
const SAME_TOKEN_COOLDOWN_MS = 8000;

export default function Scanner() {
  const { eid } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const processingRef = useRef(false);   // true only while API call is in-flight
  const lastTokenRef = useRef(null);     // { token, ts } — debounce same QR
  const clearTimerRef = useRef(null);
  const [event, setEvent] = useState(null);
  const [result, setResult] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  useEffect(() => {
    api.get('/events')
      .then(({ data }) => {
        const matchedEvent = data.find(e => e.event_id === eid);
        if (!matchedEvent) {
          setCameraError('您沒有權限查看此活動');
          navigate('/events', { replace: true });
          return;
        }
        setEvent(matchedEvent);
      })
      .catch(err => {
        setCameraError(err.response?.data?.error ?? '載入活動失敗');
      });
  }, [eid, navigate]);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader.decodeFromVideoDevice(undefined, videoRef.current, async (decoded) => {
      if (!decoded || processingRef.current) return;

      const token = decoded.getText();
      const now = Date.now();
      if (
        lastTokenRef.current?.token === token &&
        now - lastTokenRef.current.ts < SAME_TOKEN_COOLDOWN_MS
      ) return;

      processingRef.current = true;
      lastTokenRef.current = { token, ts: now };

      try {
        const { data } = await api.post(`/events/${eid}/participants/checkin`, { qr_token: token });
        setResult({ success: true, ...data.participant });
        navigator.vibrate?.([100, 50, 100]);
      } catch (apiErr) {
        const msg = apiErr.response?.data?.error ?? '無效的 QR Code';
        const dup = apiErr.response?.data?.participant;
        setResult({ success: false, error: msg, ...dup });
        navigator.vibrate?.(400);
      } finally {
        processingRef.current = false;
      }

      // Reset display timer on every new scan
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => setResult(null), RESULT_DISPLAY_MS);
    }).catch(err => {
      setCameraError(err?.message ?? '無法開啟相機');
    });

    return () => {
      clearTimeout(clearTimerRef.current);
      try { reader.reset(); } catch { /* ignore device teardown errors */ }
    };
  }, [eid]);

  const seqNumber = (reg_id) => reg_id?.split('-')[1] ?? reg_id;

  return (
    <Layout>
      <div className="scanner-page">
        <div className="scanner-header">
          <button className="icon-btn" onClick={() => navigate(`/events/${eid}`)}><ArrowLeft size={18} /></button>
          <div>
            <h2>掃碼報到</h2>
            {event && <p className="event-name-sub">{event.event_name}</p>}
          </div>
        </div>

        <div className="scanner-wrap">
          {cameraError && (
            <div className="result-card error" style={{ marginBottom: 16 }}>
              <XCircle size={40} />
              <div className="result-title">相機錯誤</div>
              <div className="result-name" style={{ fontSize: 16 }}>{cameraError}</div>
              <p style={{ fontSize: 13, opacity: 0.8 }}>請確認已授予相機權限，並使用 HTTPS 或 localhost 開啟。</p>
            </div>
          )}
          <div className="video-container">
            <video ref={videoRef} className="scanner-video" muted autoPlay playsInline />
            <div className="scan-overlay">
              <div className="scan-frame" />
              <p className="scan-hint">將 QR Code 對準框內掃描</p>
            </div>
          </div>

          {result && (
            <div
              className={`result-overlay ${result.success ? 'success' : 'error'}`}
              onClick={() => setResult(null)}
            >
              {result.success ? (
                <>
                  <CheckCircle size={96} strokeWidth={1.5} />
                  <div className="result-overlay-title">報到成功！</div>
                  <div className="result-overlay-name">{result.name}</div>
                  <div className="result-overlay-meta">
                    {result.reg_id && <span>#{seqNumber(result.reg_id)}</span>}
                    {result.unit && <span>{result.unit}</span>}
                  </div>
                </>
              ) : (
                <>
                  <XCircle size={96} strokeWidth={1.5} />
                  <div className="result-overlay-title">{result.error}</div>
                  {result.name && <div className="result-overlay-name">{result.name}</div>}
                  {result.unit && <div className="result-overlay-meta"><span>{result.unit}</span></div>}
                </>
              )}
              <div className="result-overlay-hint">點擊繼續掃碼</div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

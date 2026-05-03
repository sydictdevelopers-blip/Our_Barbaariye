import { useEffect, useMemo } from 'react';
import { Printer, X } from 'lucide-react';

const BANNER_URL =
  'https://sydimg.s3.eu-west-2.amazonaws.com/SYDlogos/banner-01.jpg';

const formatDate = (value) => {
  if (!value) return '';
  const s = String(value).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return s;
  return d.toISOString().slice(0, 10);
};

const splitParticipants = (raw) => {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map((s) => String(s).trim()).filter(Boolean);
  return String(raw)
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
};

function Section({ title, children }) {
  return (
    <section className="mm-section">
      <h2 className="mm-section-title">{title}</h2>
      <div className="mm-section-body">{children}</div>
    </section>
  );
}

export default function MeetingMinutesReportModal({ isOpen, onClose, row }) {
  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Esc to close
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const participants = useMemo(
    () => splitParticipants(row?.participance),
    [row?.participance]
  );

  if (!isOpen || !row) return null;

  const handlePrint = () => {
    document.body.classList.add('mm-printing');
    const cleanup = () => document.body.classList.remove('mm-printing');
    const onAfter = () => {
      cleanup();
      window.removeEventListener('afterprint', onAfter);
    };
    window.addEventListener('afterprint', onAfter);
    setTimeout(() => {
      window.print();
      // Some browsers don't fire afterprint reliably — also remove on next tick.
      setTimeout(cleanup, 1000);
    }, 50);
  };

  return (
    <div className="mm-overlay no-print" role="dialog" aria-modal="true">
      <div className="mm-toolbar no-print">
        <button
          type="button"
          onClick={handlePrint}
          className="mm-btn mm-btn-primary"
        >
          <Printer className="w-4 h-4" />
          <span>Print RV</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mm-btn mm-btn-ghost"
        >
          <X className="w-4 h-4" />
          <span>Close</span>
        </button>
      </div>

      <div className="mm-scroll">
        <article className="mm-page" id="mm-print-area">
          <header className="mm-header">
            <img
              src={BANNER_URL}
              alt="Institution banner"
              className="mm-banner"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </header>

          <h1 className="mm-title">Meeting Minutes</h1>

          <div className="mm-meta">
            <span className="mm-date">{formatDate(row.meet_date)}</span>
          </div>

          <Section title="Participant">
            {participants.length === 0 ? (
              <p className="mm-muted">—</p>
            ) : (
              <ol
                className={
                  participants.length > 6 ? 'mm-list mm-list-2col' : 'mm-list'
                }
              >
                {participants.map((p, i) => (
                  <li key={`${i}-${p}`}>{p}</li>
                ))}
              </ol>
            )}
          </Section>

          <Section title="Agenda">
            <p className="mm-paragraph">{row.agenda || '—'}</p>
          </Section>

          <Section title="Tasks">
            <p className="mm-paragraph">{row.comments || '—'}</p>
          </Section>

          <Section title="Decisions">
            <p className="mm-paragraph">{row.decisions || '—'}</p>
          </Section>

          <footer className="mm-footer">
            <div className="mm-signature">
              <span className="mm-signature-label">University Director:</span>
              <span className="mm-signature-line" />
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}

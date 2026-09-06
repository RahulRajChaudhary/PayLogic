// One status-color system for the whole app. Pass a known status or an explicit tone.
const TONES = {
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
  red: 'bg-red-100 text-red-700',
  gray: 'bg-cream-100 text-muted',
};

const STATUS_TONE = {
  active: 'green', approved: 'green', paid: 'green', present: 'green', running: 'green',
  computed: 'blue',
  validated: 'amber', pending: 'amber', late: 'amber',
  refused: 'red', absent: 'red', ended: 'gray', cancelled: 'gray', draft: 'gray', inactive: 'gray',
};

export default function Badge({ status, tone, children }) {
  const key = tone || STATUS_TONE[String(status || children).toLowerCase()] || 'gray';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TONES[key]}`}>
      {children ?? status}
    </span>
  );
}

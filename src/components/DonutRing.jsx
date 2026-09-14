export default function DonutRing({ segments, size = 56, strokeWidth = 8, children }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;
  let cumulative = 0;

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
        {segments.map((seg, i) => {
          const dash = Math.max(seg.fraction * circumference, 0);
          const gap = circumference - dash;
          const offset = Number((-cumulative * circumference).toFixed(2));
          cumulative += seg.fraction;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius}
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={isNaN(offset) ? "0" : offset.toString()}
              fill="transparent"
            />
          );
        })}
      </svg>
      {children}
    </div >
  );
}


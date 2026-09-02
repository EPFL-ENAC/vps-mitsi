export function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180;

    return {
        x: cx + r * Math.cos(angleRad),
        y: cy + r * Math.sin(angleRad),
    };
}

export function describeArc(
    cx: number,
    cy: number,
    r: number,
    startAngle: number,
    endAngle: number,
) {
    const start = polarToCartesian(cx, cy, r, startAngle);
    const end = polarToCartesian(cx, cy, r, endAngle);
    const sweep = endAngle - startAngle;
    const largeArcFlag = sweep > 180 ? 1 : 0;

    return [`M ${start.x} ${start.y}`, `A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`].join(
        ' ',
    );
}

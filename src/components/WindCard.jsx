import React from 'react';

const WindCard = ({ current, windExtra, gustToday, gust7d, gust30d }) => {
    const fmtVal = (v) => v == null ? '—' : Number(v).toFixed(1);
    const fmtTime = (d) => d ? new Date(d).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '';

    const Item = ({ label, data, showTime = false, showDateOnly = false }) => (
        <div className="px-3 py-2 rounded-xl bg-card-alt border border-border">
            <div className="text-xs text-text-muted">{label}</div>
            <div className="text-base font-semibold text-text">
                {fmtVal(data.value)} <span className="text-text-muted text-sm">km/h</span>
            </div>
            {showTime && data.when ? <div className="text-[11px] text-text-muted">{fmtTime(data.when)}</div> : null}
            {showDateOnly && data.when ? (
                <div className="text-[11px] text-text-muted">
                    {new Date(data.when).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </div>
            ) : null}
        </div>
    );

    return (
        <div className="rounded-2xl bg-card p-4 shadow-soft sm:p-5 sm:col-span-2 lg:col-span-3">
            <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-text-secondary">Vent</div>
                <div className="text-xs text-text-muted">Live + Rafales max</div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                    <div className="text-5xl font-semibold tracking-tight text-text">
                        {current?.windSpeed != null ? Number(current.windSpeed).toFixed(1) : '—'}
                        <span className="text-base text-text-muted ml-2">km/h</span>
                    </div>
                    <div className="text-sm text-text-secondary mt-1">{windExtra || '—'}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:min-w-[320px]">
                    <Item label="Rafale max du jour" data={gustToday} showTime={true} />
                    <Item label="Rafale max 7 jours" data={gust7d} showTime={false} showDateOnly={true} />
                    <Item label="Rafale max 1 mois" data={gust30d} showTime={false} showDateOnly={true} />
                </div>
            </div>
        </div>
    );
};

export default WindCard;

import React, { useEffect, useState } from 'react';
import { FileDown, Globe, Network, Play, RotateCcw, Save, Server, Shield, ShieldAlert, Wifi } from 'lucide-react';
import { useSaveLabResult } from '../useSaveLabResult';
import { cn } from '../../../lib/utils';

type ProtocolScenario = 'dns' | 'tcp_handshake' | 'http_get' | 'traceroute';

interface PacketHop {
  step: number;
  from: string;
  to: string;
  protocol: string;
  flags: string;
  ttl: number;
  latencyMs: number;
  status: 'forwarded' | 'delivered' | 'blocked';
  payload: string;
}

const NODES = [
  { id: 'client', label: 'Client Browser', ip: '192.168.1.14', x: 10, icon: Wifi },
  { id: 'router', label: 'NAT Router', ip: '192.168.1.1', x: 30, icon: Network },
  { id: 'firewall', label: 'Firewall', ip: '10.0.4.1', x: 52, icon: Shield },
  { id: 'dns', label: 'DNS Resolver', ip: '8.8.8.8', x: 73, icon: Globe },
  { id: 'server', label: 'Web Server', ip: '93.184.216.34', x: 92, icon: Server },
];

export default function NetworkSimulatorLab() {
  const [scenario, setScenario] = useState<ProtocolScenario>('tcp_handshake');
  const [blockFirewall, setBlockFirewall] = useState<boolean>(false);
  const [baseLatency, setBaseLatency] = useState<number>(18);
  const [activeHopIdx, setActiveHopIdx] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);

  const { saveResult, downloadPdfReport, saving, feedback, canSave } = useSaveLabResult('computer');

  const hops: PacketHop[] = React.useMemo(() => {
    const l = baseLatency;
    if (scenario === 'dns') {
      return [
        { step: 1, from: 'client', to: 'router', protocol: 'UDP:53', flags: 'DNS Query A', ttl: 64, latencyMs: Math.round(l * 0.3), status: 'forwarded', payload: 'Query: learnify.edu -> ?' },
        { step: 2, from: 'router', to: 'firewall', protocol: 'UDP:53', flags: 'NAT Translated', ttl: 63, latencyMs: Math.round(l * 0.6), status: 'forwarded', payload: 'Src NAT 192.168.1.14 -> 203.0.113.9' },
        { step: 3, from: 'firewall', to: 'dns', protocol: 'UDP:53', flags: 'Allowed Outbound', ttl: 62, latencyMs: l, status: 'forwarded', payload: 'Lookup learnify.edu' },
        { step: 4, from: 'dns', to: 'client', protocol: 'UDP:53', flags: 'DNS Answer', ttl: 58, latencyMs: Math.round(l * 1.4), status: 'delivered', payload: 'A Record: 93.184.216.34 (TTL 300s)' },
      ];
    }
    if (scenario === 'tcp_handshake') {
      return [
        { step: 1, from: 'client', to: 'router', protocol: 'TCP:443', flags: 'SYN seq=100', ttl: 64, latencyMs: Math.round(l * 0.2), status: 'forwarded', payload: 'Initiate connection to :443' },
        {
          step: 2,
          from: 'router',
          to: 'firewall',
          protocol: 'TCP:443',
          flags: blockFirewall ? 'DROP ACL DENY' : 'SYN seq=100',
          ttl: 63,
          latencyMs: Math.round(l * 0.5),
          status: blockFirewall ? 'blocked' : 'forwarded',
          payload: blockFirewall ? 'Packet dropped by Firewall Port 443 rule' : 'Inspecting TCP SYN state',
        },
        ...(blockFirewall
          ? []
          : [
              { step: 3, from: 'firewall', to: 'server', protocol: 'TCP:443', flags: 'SYN seq=100', ttl: 62, latencyMs: l, status: 'forwarded' as const, payload: 'SYN arrived at Web Server' },
              { step: 4, from: 'server', to: 'client', protocol: 'TCP:443', flags: 'SYN-ACK ack=101', ttl: 56, latencyMs: Math.round(l * 1.8), status: 'forwarded' as const, payload: 'Server acknowledges & sends ISN=500' },
              { step: 5, from: 'client', to: 'server', protocol: 'TCP:443', flags: 'ACK ack=501', ttl: 64, latencyMs: Math.round(l * 2.1), status: 'delivered' as const, payload: '3-Way Handshake Established' },
            ]),
      ];
    }
    if (scenario === 'http_get') {
      return [
        { step: 1, from: 'client', to: 'router', protocol: 'HTTPS', flags: 'TLS 1.3 + GET /', ttl: 64, latencyMs: Math.round(l * 0.3), status: 'forwarded', payload: 'GET /lab/index.html HTTP/2' },
        {
          step: 2,
          from: 'router',
          to: 'firewall',
          protocol: 'HTTPS',
          flags: blockFirewall ? 'BLOCKED HTTPS' : 'TLS Encrypted',
          ttl: 63,
          latencyMs: Math.round(l * 0.6),
          status: blockFirewall ? 'blocked' : 'forwarded',
          payload: blockFirewall ? 'Blocked outbound HTTPS policy' : 'Deep packet pass-through',
        },
        ...(blockFirewall
          ? []
          : [
              { step: 3, from: 'firewall', to: 'server', protocol: 'HTTPS', flags: 'Request Delivered', ttl: 61, latencyMs: l, status: 'forwarded' as const, payload: 'Server processing route /lab/index.html' },
              { step: 4, from: 'server', to: 'client', protocol: 'HTTPS', flags: '200 OK (18 KB)', ttl: 56, latencyMs: Math.round(l * 1.9), status: 'delivered' as const, payload: 'HTML & JS bundle rendered on Client' },
            ]),
      ];
    }
    // Traceroute
    return [
      { step: 1, from: 'client', to: 'router', protocol: 'ICMP', flags: 'TTL=1 Probe', ttl: 1, latencyMs: Math.round(l * 0.2), status: 'forwarded', payload: 'Hop 1: Time Exceeded from 192.168.1.1' },
      { step: 2, from: 'client', to: 'firewall', protocol: 'ICMP', flags: 'TTL=2 Probe', ttl: 2, latencyMs: Math.round(l * 0.6), status: blockFirewall ? 'blocked' : 'forwarded', payload: blockFirewall ? 'ICMP Ping Blocked at Firewall' : 'Hop 2: Gateway 10.0.4.1' },
      ...(blockFirewall
        ? []
        : [
            { step: 3, from: 'client', to: 'dns', protocol: 'ICMP', flags: 'TTL=3 Probe', ttl: 3, latencyMs: l, status: 'forwarded' as const, payload: 'Hop 3: Core Peering Router' },
            { step: 4, from: 'client', to: 'server', protocol: 'ICMP', flags: 'Echo Reply', ttl: 4, latencyMs: Math.round(l * 1.6), status: 'delivered' as const, payload: 'Destination 93.184.216.34 reached' },
          ]),
    ];
  }, [scenario, blockFirewall, baseLatency]);

  useEffect(() => {
    setActiveHopIdx(0);
    setPlaying(false);
  }, [scenario, blockFirewall]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setActiveHopIdx((idx) => {
        if (idx + 1 >= hops.length) {
          setPlaying(false);
          return idx;
        }
        return idx + 1;
      });
    }, 850);
    return () => window.clearInterval(timer);
  }, [playing, hops.length]);

  const currentHop = hops[Math.min(activeHopIdx, hops.length - 1)];
  const fromNode = NODES.find((n) => n.id === currentHop.from) ?? NODES[0];
  const toNode = NODES.find((n) => n.id === currentHop.to) ?? NODES[1];
  const packetX = (fromNode.x + toNode.x) / 2;

  return (
    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Computer Networks &amp; Packet Routing Simulator
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Trace DNS lookups, TCP 3-way handshakes, HTTPS requests, firewall filtering, and ICMP traceroute hops.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-muted p-1 rounded-xl overflow-x-auto max-w-full">
            {(
              [
                ['tcp_handshake', 'TCP 3-Way'],
                ['dns', 'DNS Lookup'],
                ['http_get', 'HTTPS GET'],
                ['traceroute', 'Traceroute'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setScenario(id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap',
                  scenario === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Network Topology Stage */}
      <div className="rounded-2xl bg-slate-950 border border-border p-5 space-y-5">
        <div className="relative h-36 flex items-center justify-between px-3 sm:px-8">
          {/* Backbone link line */}
          <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-0.5 bg-slate-700" />

          {/* Moving Packet Pill */}
          <div
            className={cn(
              'absolute top-3 -translate-x-1/2 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all duration-500 border',
              currentHop.status === 'blocked'
                ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                : currentHop.status === 'delivered'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-sky-500/20 border-sky-400 text-sky-200'
            )}
            style={{ left: `${packetX}%` }}
          >
            {currentHop.flags}
          </div>

          {NODES.map((node) => {
            const Icon = node.id === 'firewall' && blockFirewall ? ShieldAlert : node.icon;
            const isTarget = currentHop.to === node.id || currentHop.from === node.id;
            return (
              <div key={node.id} className="relative z-10 flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'w-11 h-11 rounded-2xl border flex items-center justify-center transition-colors',
                    node.id === 'firewall' && blockFirewall
                      ? 'bg-rose-950 border-rose-500 text-rose-400'
                      : isTarget
                        ? 'bg-sky-950 border-sky-400 text-sky-300'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                  )}
                >
                  <Icon size={18} />
                </div>
                <span className="text-[11px] font-semibold text-slate-100 text-center">
                  {node.label}
                </span>
                <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                  {node.ip}
                </span>
              </div>
            );
          })}
        </div>

        {/* Simulation Playback Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (activeHopIdx >= hops.length - 1) setActiveHopIdx(0);
                setPlaying((p) => !p);
              }}
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Play size={13} />
              <span>{playing ? 'Running...' : 'Simulate Packet Flow'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveHopIdx((i) => (i + 1) % hops.length)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
            >
              Step Hop ({activeHopIdx + 1}/{hops.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setActiveHopIdx(0);
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
              title="Reset"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <button
              type="button"
              onClick={() => setBlockFirewall((b) => !b)}
              className={cn(
                'px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors',
                blockFirewall
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              )}
            >
              Firewall: {blockFirewall ? 'BLOCKING' : 'ALLOWING'}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Base RTT:</span>
              <input
                type="range"
                min={5}
                max={120}
                value={baseLatency}
                onChange={(e) => setBaseLatency(Number(e.target.value))}
                className="w-20 accent-sky-400"
              />
              <span className="font-mono w-12">{baseLatency} ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Packet Header Inspector Table */}
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 text-muted-foreground border-b border-border">
            <tr>
              <th className="py-2.5 px-3">Hop</th>
              <th className="py-2.5 px-3">Route</th>
              <th className="py-2.5 px-3">Protocol</th>
              <th className="py-2.5 px-3">Flags / Header</th>
              <th className="py-2.5 px-3">TTL</th>
              <th className="py-2.5 px-3">Latency</th>
              <th className="py-2.5 px-3">Payload</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {hops.map((h, i) => (
              <tr
                key={h.step}
                onClick={() => setActiveHopIdx(i)}
                className={cn(
                  'cursor-pointer transition-colors',
                  i === activeHopIdx ? 'bg-primary/10 font-medium' : 'hover:bg-muted/30'
                )}
              >
                <td className="py-2.5 px-3 font-mono">#{h.step}</td>
                <td className="py-2.5 px-3 font-mono">
                  {h.from} → {h.to}
                </td>
                <td className="py-2.5 px-3 font-mono">{h.protocol}</td>
                <td
                  className={cn(
                    'py-2.5 px-3 font-mono',
                    h.status === 'blocked'
                      ? 'text-rose-500'
                      : h.status === 'delivered'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-sky-600 dark:text-sky-400'
                  )}
                >
                  {h.flags}
                </td>
                <td className="py-2.5 px-3 font-mono">{h.ttl}</td>
                <td className="py-2.5 px-3 font-mono tabular-nums">{h.latencyMs} ms</td>
                <td className="py-2.5 px-3 text-muted-foreground">{h.payload}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {feedback ? feedback.text : 'Log this packet trace experiment or export a detailed PDF packet-routing summary.'}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {canSave && (
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                saveResult({
                  experimentTitle: `Network Trace (${scenario.toUpperCase()})`,
                  outcome: `${hops.length} packet hops simulated (${blockFirewall ? 'Firewall Denied' : 'Delivered Successfully'})`,
                  formula: `Base RTT ${baseLatency} ms`,
                  measurements: hops.map((h) => `${h.from}->${h.to}:${h.flags}`).join(' | '),
                })
              }
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 whitespace-nowrap"
            >
              <Save size={14} />
              <span>{saving ? 'Saving...' : 'Save Lab'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              downloadPdfReport({
                experimentTitle: `Network Trace (${scenario.toUpperCase()})`,
                outcome: `Simulated ${hops.length} network hops for ${scenario.toUpperCase()} (${blockFirewall ? 'Firewall Policy Dropped Traffic at Port/ACL' : 'End-to-End Packet Delivery Verified'}).`,
                formula: `Base RTT = ${baseLatency} ms | Firewall ACL = ${blockFirewall ? 'DENY' : 'ALLOW'}`,
                measurements: `Hops traced: ${hops.length} | Final hop latency: ${hops[hops.length - 1]?.latencyMs ?? baseLatency} ms | Final status: ${hops[hops.length - 1]?.status ?? 'complete'}`,
                stepsTaken: hops.map(
                  (h) => `Hop #${h.step} (${h.from} -> ${h.to}, ${h.protocol}, TTL=${h.ttl}, ${h.latencyMs}ms): [${h.flags}] ${h.payload}`
                ),
              })
            }
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-500 whitespace-nowrap"
          >
            <FileDown size={14} />
            <span>PDF Report</span>
          </button>
        </div>
      </div>
    </div>
  );
}

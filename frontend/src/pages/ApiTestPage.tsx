import React, { useState } from 'react'
import {
  Terminal,
  Play,
  Copy,
  Check,
  RotateCw,
  AlertTriangle,
  ShieldCheck,
  Send,
  Code2,
  Layers,
  Sparkles,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

type TestTab = 'single' | 'bulk' | 'webhook'

export const ApiTestPage: React.FC = () => {
  const { language } = useLanguage()
  const isTh = language === 'th'

  const [activeTest, setActiveTest] = useState<TestTab>('single')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Single Check State
  const [singleValue, setSingleValue] = useState('1.117.74.144')
  const [singleLoading, setSingleLoading] = useState(false)
  const [singleResult, setSingleResult] = useState<any | null>(null)
  const [singleLatency, setSingleLatency] = useState<number | null>(null)

  // Bulk Check State
  const [bulkText, setBulkText] = useState(
    '1.117.74.144\nadzcoin.miningpoolhub.com\n4c81777551a772218519fb6dd1a6672aade4a936\n8.8.8.8\n1.12.253.219'
  )
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResult, setBulkResult] = useState<any | null>(null)
  const [bulkLatency, setBulkLatency] = useState<number | null>(null)

  // Webhook Simulator State
  const cobaltStrikeMock = {
    id: '17100001.99281',
    timestamp: new Date().toISOString(),
    rule: {
      id: '100002',
      level: 7,
      description: 'Sysmon - Outbound network connection to remote server',
    },
    agent: {
      id: '001',
      name: 'PROD-WIN-SRV01',
      ip: '192.168.1.105',
    },
    data: {
      srcip: '192.168.1.105',
      dstip: '1.117.74.144',
      dstport: '443',
      win: {
        eventdata: {
          image: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
          destinationIp: '1.117.74.144',
        },
      },
    },
  }

  const coinminerMock = {
    id: '17100002.44192',
    timestamp: new Date().toISOString(),
    rule: {
      id: '100005',
      level: 6,
      description: 'Sysmon - DNS Query Event (Event ID 22)',
    },
    agent: {
      id: '002',
      name: 'DESKTOP-ACCOUNTING',
      ip: '192.168.1.42',
    },
    data: {
      win: {
        eventdata: {
          image: 'C:\\Users\\User\\AppData\\Local\\Temp\\kworker34.exe',
          queryName: 'adzcoin.miningpoolhub.com',
          queryStatus: '0',
        },
      },
    },
  }

  const [webhookJson, setWebhookJson] = useState(JSON.stringify(cobaltStrikeMock, null, 2))
  const [webhookLoading, setWebhookLoading] = useState(false)
  const [webhookResult, setWebhookResult] = useState<any | null>(null)
  const [webhookLatency, setWebhookLatency] = useState<number | null>(null)

  const apiHost = window.location.hostname || '127.0.0.1'
  const backendBase = `http://${apiHost}:8000`

  // Handlers
  const handleRunSingle = async (valToTest?: string) => {
    const val = valToTest || singleValue
    if (!val.trim()) return
    try {
      setSingleLoading(true)
      setSingleResult(null)
      const start = performance.now()
      const res = await fetch(`/api/wazuh/ioc/check?value=${encodeURIComponent(val.trim())}`)
      const data = await res.json()
      setSingleLatency(Math.round(performance.now() - start))
      setSingleResult(data)
    } catch (e: any) {
      setSingleResult({ error: e.message })
    } finally {
      setSingleLoading(false)
    }
  }

  const handleRunBulk = async () => {
    const lines = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    if (lines.length === 0) return

    try {
      setBulkLoading(true)
      setBulkResult(null)
      const start = performance.now()
      const res = await fetch('/api/wazuh/ioc/check-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: lines }),
      })
      const data = await res.json()
      setBulkLatency(Math.round(performance.now() - start))
      setBulkResult(data)
    } catch (e: any) {
      setBulkResult({ error: e.message })
    } finally {
      setBulkLoading(false)
    }
  }

  const handleRunWebhook = async () => {
    try {
      setWebhookLoading(true)
      setWebhookResult(null)
      const parsed = JSON.parse(webhookJson)
      const start = performance.now()
      const res = await fetch('/api/wazuh/webhook/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      })
      const data = await res.json()
      setWebhookLatency(Math.round(performance.now() - start))
      setWebhookResult(data)
    } catch (e: any) {
      setWebhookResult({ error: e.message })
    } finally {
      setWebhookLoading(false)
    }
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg text-white shadow-md shadow-purple-900/30">
              <Terminal className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              {isTh ? 'คอนโซลทดสอบ CTI API (API Test Console)' : 'Wazuh CTI API Test Console'}
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-mono">
                LIVE INTERACTIVE
              </span>
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {isTh
              ? 'ทดสอบการส่งคำขอและดูผลลัพธ์ JSON จำลองการที่ Wazuh Agent / Integrator ยิงเข้ามาตรวจสอบ IOC แบบเรียลไทม์'
              : 'Test API requests interactively and view JSON responses as Wazuh Manager / Integratord would see them.'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTest('single')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTest === 'single'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isTh ? '1. ตรวจรายตัว (Single)' : '1. Single IOC Check'}</span>
          </button>
          <button
            onClick={() => setActiveTest('bulk')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTest === 'bulk'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isTh ? '2. ตรวจเป็นชุด (Bulk)' : '2. Bulk Check'}</span>
          </button>
          <button
            onClick={() => setActiveTest('webhook')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTest === 'webhook'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isTh ? '3. จำลอง Alert Webhook' : '3. Alert Webhook'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: SINGLE IOC CHECK */}
      {/* ========================================================================= */}
      {activeTest === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input side */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold">GET</span>
                <span className="text-slate-300">/api/wazuh/ioc/check?value=...</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">Instant Verdict</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                {isTh ? 'ใส่ค่าตัวบ่งชี้ (IP, Domain, หรือ File Hash):' : 'Indicator Value (IP, Domain, or Hash):'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={singleValue}
                  onChange={(e) => setSingleValue(e.target.value)}
                  placeholder="e.g. 1.117.74.144"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={() => handleRunSingle()}
                  disabled={singleLoading || !singleValue.trim()}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${singleLoading ? 'animate-spin' : ''}`} />
                  <span>{singleLoading ? 'Checking...' : (isTh ? 'ส่งคำขอ' : 'Send')}</span>
                </button>
              </div>
            </div>

            {/* Presets */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                {isTh ? 'กดปุ่มเพื่อทดสอบเคสจริงทันที:' : 'Quick Presets:'}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSingleValue('1.117.74.144')
                    handleRunSingle('1.117.74.144')
                  }}
                  className="px-2.5 py-1 rounded bg-rose-950/60 border border-rose-800/60 hover:bg-rose-900/60 text-rose-300 text-[11px] font-mono transition-colors"
                >
                  🔴 Cobalt Strike C2 IP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSingleValue('adzcoin.miningpoolhub.com')
                    handleRunSingle('adzcoin.miningpoolhub.com')
                  }}
                  className="px-2.5 py-1 rounded bg-amber-950/60 border border-amber-800/60 hover:bg-amber-900/60 text-amber-300 text-[11px] font-mono transition-colors"
                >
                  ⛏️ Coinminer Pool Domain
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSingleValue('4c81777551a772218519fb6dd1a6672aade4a936')
                    handleRunSingle('4c81777551a772218519fb6dd1a6672aade4a936')
                  }}
                  className="px-2.5 py-1 rounded bg-purple-950/60 border border-purple-800/60 hover:bg-purple-900/60 text-purple-300 text-[11px] font-mono transition-colors"
                >
                  📜 Cobalt Strike Beacon Hash
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSingleValue('8.8.8.8')
                    handleRunSingle('8.8.8.8')
                  }}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition-colors"
                >
                  🟢 Clean IP (8.8.8.8)
                </button>
              </div>
            </div>

            {/* Generated cURL code */}
            <div className="pt-3 border-t border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                  {isTh ? 'คำสั่ง cURL สำหรับยิงจาก Wazuh Server' : 'Wazuh cURL Command'}
                </span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `curl -s "${backendBase}/api/wazuh/ioc/check?value=${singleValue}"`,
                      'curl_single'
                    )
                  }
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono text-[10px]"
                >
                  {copiedKey === 'curl_single' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copy cURL</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto">
                {`curl -s "${backendBase}/api/wazuh/ioc/check?value=${singleValue}"`}
              </pre>
            </div>
          </div>

          {/* Response side */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">{isTh ? 'ผลลัพธ์การวิเคราะห์ (Response)' : 'Analysis Response'}</span>
                {singleLatency !== null && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {singleLatency} ms
                  </span>
                )}
              </div>
              {singleResult && (
                <button
                  onClick={() => copyToClipboard(JSON.stringify(singleResult, null, 2), 'copy_single_res')}
                  className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] font-mono"
                >
                  {copiedKey === 'copy_single_res' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copy JSON</span>
                </button>
              )}
            </div>

            {singleResult ? (
              <div className="space-y-3">
                {/* Visual Status Card */}
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    singleResult.malicious
                      ? 'bg-rose-950/30 border-rose-500/50 text-rose-200'
                      : 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {singleResult.malicious ? (
                      <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
                    ) : (
                      <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-sm flex items-center gap-2">
                        <span>{singleResult.malicious ? 'THREAT DETECTED' : 'CLEAN INDICATOR'}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                            singleResult.severity === 'CRITICAL'
                              ? 'bg-rose-600 text-white'
                              : singleResult.severity === 'HIGH'
                              ? 'bg-amber-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {singleResult.severity}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5">
                        {singleResult.threat_category || 'No threat context'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase font-mono text-slate-400">Action</div>
                    <div
                      className={`text-xs font-bold font-mono px-2.5 py-1 rounded mt-0.5 ${
                        singleResult.action === 'BLOCK'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {singleResult.action || 'ALLOW'}
                    </div>
                  </div>
                </div>

                {/* Formatted JSON */}
                <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-80">
                  {JSON.stringify(singleResult, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded-xl">
                {isTh ? 'กดปุ่ม "ส่งคำขอ" หรือเลือกตัวอย่างเพื่อดูผลลัพธ์' : 'Click "Send" or choose a preset to inspect response'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: BULK MULTI-IOC CHECK */}
      {/* ========================================================================= */}
      {activeTest === 'bulk' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 font-bold">POST</span>
                <span className="text-slate-300">/api/wazuh/ioc/check-bulk</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">High-Throughput Batch</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>{isTh ? 'รายการตัวบ่งชี้ (บรรทัดละ 1 ค่า):' : 'Indicator List (one per line):'}</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {bulkText.split('\n').filter(Boolean).length} items
                </span>
              </div>
              <textarea
                rows={8}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              onClick={handleRunBulk}
              disabled={bulkLoading}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow"
            >
              <RotateCw className={`w-3.5 h-3.5 ${bulkLoading ? 'animate-spin' : ''}`} />
              <span>{bulkLoading ? 'Processing Batch...' : (isTh ? 'ตรวจสอบทั้งชุดพร้อมกัน (Check Bulk)' : 'Check All Batch')}</span>
            </button>
          </div>

          {/* Bulk Response */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">{isTh ? 'สรุปผลการตรวจสอบชุด IOC' : 'Batch Results Summary'}</span>
                {bulkLatency !== null && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {bulkLatency} ms
                  </span>
                )}
              </div>
            </div>

            {bulkResult ? (
              <div className="space-y-4">
                {/* Stats badge row */}
                <div className="grid grid-cols-3 gap-2 text-center font-mono">
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400">Total Checked</div>
                    <div className="text-base font-bold text-white mt-0.5">{bulkResult.total_checked}</div>
                  </div>
                  <div className="p-2.5 bg-rose-950/30 rounded-lg border border-rose-800/40">
                    <div className="text-[10px] text-rose-300">Threats Found</div>
                    <div className="text-base font-bold text-rose-400 mt-0.5">{bulkResult.malicious_count}</div>
                  </div>
                  <div className="p-2.5 bg-emerald-950/30 rounded-lg border border-emerald-800/40">
                    <div className="text-[10px] text-emerald-300">Clean Passed</div>
                    <div className="text-base font-bold text-emerald-400 mt-0.5">
                      {bulkResult.total_checked - bulkResult.malicious_count}
                    </div>
                  </div>
                </div>

                {/* Table Breakdown */}
                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px]">
                      <tr>
                        <th className="p-2.5">Indicator</th>
                        <th className="p-2.5">Verdict</th>
                        <th className="p-2.5">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {bulkResult.results?.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-900/40">
                          <td className="p-2.5 text-white truncate max-w-[150px]">{item.indicator}</td>
                          <td className="p-2.5">
                            {item.malicious ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                                {item.severity}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                                CLEAN
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-400 truncate max-w-[180px]">
                            {item.threat_category || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded-xl">
                {isTh ? 'กดปุ่มเพื่อเริ่มประมวลผลทั้งชุด' : 'Click "Check All Batch" to run bulk query'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: WAZUH WEBHOOK SIMULATOR */}
      {/* ========================================================================= */}
      {activeTest === 'webhook' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 font-bold">POST</span>
                <span className="text-slate-300">/api/wazuh/webhook/alert</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">Wazuh Integrator Daemon</span>
            </div>

            {/* Template Selector */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400 font-semibold">{isTh ? 'เลือกตัวอย่าง Wazuh Alert จำลอง:' : 'Load Mock Alert Template:'}</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setWebhookJson(JSON.stringify(cobaltStrikeMock, null, 2))}
                  className="px-2.5 py-1 rounded bg-rose-950/60 border border-rose-800/60 hover:bg-rose-900/60 text-rose-300 text-[11px] font-mono"
                >
                  🔴 Cobalt Strike Network Alert
                </button>
                <button
                  type="button"
                  onClick={() => setWebhookJson(JSON.stringify(coinminerMock, null, 2))}
                  className="px-2.5 py-1 rounded bg-amber-950/60 border border-amber-800/60 hover:bg-amber-900/60 text-amber-300 text-[11px] font-mono"
                >
                  ⛏️ Coinminer DNS Query Alert
                </button>
              </div>
            </div>

            {/* JSON Editor */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {isTh ? 'เนื้อหา JSON ของ Alert จาก Wazuh:' : 'Raw Wazuh Alert JSON Payload:'}
              </label>
              <textarea
                rows={12}
                value={webhookJson}
                onChange={(e) => setWebhookJson(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-[11px] font-mono text-cyan-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              onClick={handleRunWebhook}
              disabled={webhookLoading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow"
            >
              <Send className={`w-3.5 h-3.5 ${webhookLoading ? 'animate-spin' : ''}`} />
              <span>{webhookLoading ? 'Analyzing Alert...' : (isTh ? 'ส่ง Alert จำลองเข้า API (Simulate Webhook)' : 'Simulate Alert Post')}</span>
            </button>
          </div>

          {/* Webhook Response */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">{isTh ? 'การวิเคราะห์ IOC ใน Alert (Verdict)' : 'Wazuh Webhook Verdict'}</span>
                {webhookLatency !== null && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {webhookLatency} ms
                  </span>
                )}
              </div>
            </div>

            {webhookResult ? (
              <div className="space-y-3">
                {webhookResult.matched ? (
                  <div className="p-3.5 rounded-xl border bg-rose-950/30 border-rose-500/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-rose-400 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        THREAT CONFIRMED IN WAZUH ALERT!
                      </span>
                      <span className="text-xs font-mono font-bold bg-rose-600 text-white px-2 py-0.5 rounded">
                        CRITICAL LEVEL 14
                      </span>
                    </div>
                    <div className="text-xs text-slate-300">
                      {isTh
                        ? `ระบบสแกนพบ IOC อันตราย ${webhookResult.matches_count} ตัวใน Alert นี้!`
                        : `Successfully extracted and matched ${webhookResult.matches_count} malicious indicators!`}
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {webhookResult.threats?.map((t: any, idx: number) => (
                        <div key={idx} className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-xs font-mono space-y-1">
                          <div className="flex items-center justify-between text-slate-400 text-[11px]">
                            <span>Field: <strong className="text-white">{t.field}</strong></span>
                            <span className="text-rose-400 font-bold">{t.action}</span>
                          </div>
                          <div className="text-cyan-300 font-bold">{t.value}</div>
                          <div className="text-slate-300 text-[11px]">{t.threat_category}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border bg-emerald-950/30 border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <span>No known threats found in this event. Allowed to pass.</span>
                  </div>
                )}

                {/* Formatted JSON */}
                <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-72">
                  {JSON.stringify(webhookResult, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded-xl">
                {isTh ? 'กดปุ่ม "ส่ง Alert จำลอง" เพื่อทดสอบการสแกน' : 'Click "Simulate Alert Post" to run analysis'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

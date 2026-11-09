import React, { useState, useEffect } from 'react'
import {
  Shield,
  Download,
  Copy,
  Check,
  RefreshCw,
  Terminal,
  Activity,
  Search,
  AlertTriangle,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

interface WazuhStats {
  status: string
  wazuh_cdb_ready_ips: number
  wazuh_ready_urls: number
  wazuh_ready_hashes: number
  wazuh_ready_domains: number
  total_active_feed_indicators: number
  verified_internal_cases: number
  verified_internal_iocs: number
  cdb_endpoints: {
    ips_cdb: string
    hashes_cdb: string
    domains_cdb: string
    urls_txt: string
  }
}

export const WazuhPage: React.FC = () => {
  const { language } = useLanguage()
  const isTh = language === 'th'

  const [stats, setStats] = useState<WazuhStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Live test match
  const [testValue, setTestValue] = useState('')
  const [testResult, setTestResult] = useState<any | null>(null)
  const [testing, setTesting] = useState(false)

  // Sync state
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const apiHost = window.location.hostname || '127.0.0.1'
  const backendBase = `http://${apiHost}:8000`

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/wazuh/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (e) {
      console.error('Failed to load Wazuh stats', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSyncFeeds = async () => {
    try {
      setSyncing(true)
      setSyncMsg(null)
      const res = await fetch('/api/wazuh/sync-feeds', { method: 'POST' })
      const data = await res.json()
      setSyncMsg(data.message || 'Sync completed successfully.')
      await loadStats()
    } catch (err: any) {
      setSyncMsg(`Sync error: ${err.message}`)
    } finally {
      setSyncing(false)
    }
  }

  const handleTestMatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testValue.trim()) return
    try {
      setTesting(true)
      setTestResult(null)
      const res = await fetch('/api/wazuh/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: testValue.trim() }),
      })
      const data = await res.json()
      setTestResult(data)
    } catch (err: any) {
      setTestResult({ error: err.message })
    } finally {
      setTesting(false)
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
            <div className="p-2 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-lg text-white shadow-md shadow-cyan-900/30">
              <Shield className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              {isTh ? 'เชื่อมต่อ Wazuh SIEM & CDB Blocklists' : 'Wazuh SIEM & CDB Lists Integration'}
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono">
                ONLINE
              </span>
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {isTh
              ? 'ส่งออกรายการ IOC ในรูปแบบ Wazuh CDB List และทดสอบ API เรียลไทม์สำหรับ Active Response / Integrator'
              : 'Export IOCs in native Wazuh CDB List format and provide real-time API lookup for Wazuh Integrator'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncFeeds}
            disabled={syncing}
            className="flex items-center space-x-2 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-cyan-900/40 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{isTh ? 'อัปเดตฟีด CTI สด' : 'Sync Live Feeds'}</span>
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className="p-3 bg-cyan-950/40 border border-cyan-800/60 rounded-xl text-xs text-cyan-300 font-mono flex items-center justify-between">
          <span>{syncMsg}</span>
          <button onClick={() => setSyncMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 font-mono">{isTh ? 'Wazuh CDB IPs พร้อมบล็อก' : 'CDB Malicious IPs'}</div>
          <div className="text-2xl font-bold text-cyan-400 font-mono mt-1">
            {loading ? '...' : (stats?.wazuh_cdb_ready_ips ?? 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Tier-1 Feeds + Verified Cases</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 font-mono">{isTh ? 'URL ฟิชชิ่ง & C2' : 'Malicious URLs'}</div>
          <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
            {loading ? '...' : (stats?.wazuh_ready_urls ?? 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">OpenPhish zero-day URLs</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 font-mono">{isTh ? 'ไฟล์แฮชอันตราย (Hashes)' : 'Malicious Hashes'}</div>
          <div className="text-2xl font-bold text-rose-400 font-mono mt-1">
            {loading ? '...' : (stats?.wazuh_ready_hashes ?? 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">MD5, SHA1, SHA256</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 font-mono">{isTh ? 'โดเมนอันตราย (Domains)' : 'C2 Domains'}</div>
          <div className="text-2xl font-bold text-purple-400 font-mono mt-1">
            {loading ? '...' : (stats?.wazuh_ready_domains ?? 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">DNS query matching</div>
        </div>
      </div>

      {/* Main Sections: Export Endpoints & Interactive Matcher */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wazuh CDB Download Links */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-cyan-400" />
              {isTh ? 'ลิงก์ดาวน์โหลด Wazuh CDB Lists' : 'Wazuh CDB List Endpoints'}
            </h2>
            <span className="text-[11px] font-mono text-slate-400">format: key:value</span>
          </div>

          <div className="space-y-3">
            {/* IP CDB */}
            <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white flex items-center gap-2">
                  <span>malicious_ips.cdb</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50 font-mono">
                    IP Blocklist
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                  {backendBase}/api/wazuh/lists/ips.cdb
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => copyToClipboard(`${backendBase}/api/wazuh/lists/ips.cdb`, 'ips')}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Copy URL"
                >
                  {copiedKey === 'ips' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href="/api/wazuh/lists/ips.cdb"
                  target="_blank"
                  download="malicious_ips.cdb"
                  className="p-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Hashes CDB */}
            <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white flex items-center gap-2">
                  <span>malicious_hashes.cdb</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-800/50 font-mono">
                    FIM / Sysmon
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                  {backendBase}/api/wazuh/lists/hashes.cdb
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => copyToClipboard(`${backendBase}/api/wazuh/lists/hashes.cdb`, 'hashes')}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Copy URL"
                >
                  {copiedKey === 'hashes' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href="/api/wazuh/lists/hashes.cdb"
                  target="_blank"
                  download="malicious_hashes.cdb"
                  className="p-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Domains CDB */}
            <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white flex items-center gap-2">
                  <span>malicious_domains.cdb</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-400 border border-purple-800/50 font-mono">
                    DNS Monitoring
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                  {backendBase}/api/wazuh/lists/domains.cdb
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => copyToClipboard(`${backendBase}/api/wazuh/lists/domains.cdb`, 'domains')}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Copy URL"
                >
                  {copiedKey === 'domains' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href="/api/wazuh/lists/domains.cdb"
                  target="_blank"
                  download="malicious_domains.cdb"
                  className="p-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* URLs Text */}
            <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white flex items-center gap-2">
                  <span>phishing_urls.txt</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800/50 font-mono">
                    Proxy / Suricata
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                  {backendBase}/api/wazuh/lists/urls.txt
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => copyToClipboard(`${backendBase}/api/wazuh/lists/urls.txt`, 'urls')}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Copy URL"
                >
                  {copiedKey === 'urls' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href="/api/wazuh/lists/urls.txt"
                  target="_blank"
                  download="phishing_urls.txt"
                  className="p-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Live Indicator Matcher (Simulator for Wazuh Integrator) */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              {isTh ? 'ทดสอบ Real-time Lookup API (Wazuh Matcher)' : 'Real-time Lookup Simulator'}
            </h2>
            <span className="text-[11px] font-mono text-slate-400">POST /api/wazuh/match</span>
          </div>

          <p className="text-xs text-slate-400">
            {isTh
              ? 'จำลองการส่ง IP หรือ Hash จาก Wazuh Agent/Integrator มาตรวจสอบในคลัง CTI แบบเรียลไทม์'
              : 'Simulate how Wazuh Integrator script queries an IP or Hash against the CTI database in real-time.'}
          </p>

          <form onSubmit={handleTestMatch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={testValue}
                onChange={(e) => setTestValue(e.target.value)}
                placeholder="e.g. 162.243.103.246 or malicious-domain.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              type="submit"
              disabled={testing || !testValue.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{testing ? 'Testing...' : (isTh ? 'ตรวจสอบ' : 'Match')}</span>
            </button>
          </form>

          {/* Quick test pills */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>{isTh ? 'ตัวอย่างทดสอบ:' : 'Quick tests:'}</span>
            <button
              type="button"
              onClick={() => setTestValue('162.243.103.246')}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded font-mono text-[10px]"
            >
              162.243.103.246
            </button>
            <button
              type="button"
              onClick={() => setTestValue('50.16.16.211')}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded font-mono text-[10px]"
            >
              50.16.16.211
            </button>
          </div>

          {/* Match Response Display */}
          {testResult && (
            <div className={`p-3 rounded-lg border text-xs font-mono space-y-1.5 ${
              testResult.matched
                ? 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  {testResult.matched ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      <span className="text-rose-400">THREAT MATCHED!</span>
                    </>
                  ) : (
                    <span className="text-slate-400">NO THREAT DETECTED</span>
                  )}
                </span>
                {testResult.severity && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                    {testResult.severity}
                  </span>
                )}
              </div>
              {testResult.tier && <div className="text-[11px] text-slate-300">Tier: {testResult.tier}</div>}
              {testResult.description && <div className="text-[11px] text-slate-300">Context: {testResult.description}</div>}
              {testResult.recommendation && (
                <div className="text-[11px] text-amber-300 mt-1 font-semibold">
                  Action: {testResult.recommendation}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Step-by-Step Wazuh Configuration Instructions */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">
            {isTh ? 'วิธีติดตั้งและเชื่อมต่อบน Wazuh Server (Production Guide)' : 'Wazuh Production Setup Instructions'}
          </h2>
        </div>

        <div className="space-y-4 text-xs font-mono text-slate-300">
          {/* Step 1 */}
          <div className="space-y-1.5">
            <div className="text-slate-400 font-bold flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-600/30 text-cyan-400 flex items-center justify-center text-[10px]">1</span>
              {isTh ? 'ดาวน์โหลด CDB List ลงที่ Wazuh Manager' : 'Download CDB List to Wazuh Manager'}
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-300 overflow-x-auto">
              <pre>{`# สร้างโฟลเดอร์เก็บ list และดาวน์โหลดจาก CTI Backend
curl -s http://${apiHost}:8000/api/wazuh/lists/ips.cdb -o /var/ossec/etc/lists/malicious_ips

# รัน compile CDB format ด้วยเครื่องมือของ Wazuh
/var/ossec/bin/wazuh-makelists`}</pre>
            </div>
          </div>

          {/* Step 2 */}
          <div className="space-y-1.5">
            <div className="text-slate-400 font-bold flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-600/30 text-cyan-400 flex items-center justify-center text-[10px]">2</span>
              {isTh ? 'เปิดใช้งาน List ใน ossec.conf' : 'Register List in /var/ossec/etc/ossec.conf'}
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-300 overflow-x-auto">
              <pre>{`<ossec_config>
  <ruleset>
    <!-- ไม่ต้องใส่ .cdb เพราะ Wazuh จะเติมให้อัตโนมัติ -->
    <list>etc/lists/malicious_ips</list>
  </ruleset>
</ossec_config>`}</pre>
            </div>
          </div>

          {/* Step 3 */}
          <div className="space-y-1.5">
            <div className="text-slate-400 font-bold flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-600/30 text-cyan-400 flex items-center justify-center text-[10px]">3</span>
              {isTh ? 'สร้าง Rule แจ้งเตือนเมื่อตรวจพบ IOC ใน local_rules.xml' : 'Add Alert Rule in /var/ossec/etc/rules/local_rules.xml'}
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-300 overflow-x-auto">
              <pre>{`<group name="cti_intel,">
  <!-- สำหรับ IP ใช้ lookup="address_match_key" เพื่อรองรับทั้งเดี่ยวและ Subnet -->
  <rule id="100300" level="12">
    <list field="srcip" lookup="address_match_key">etc/lists/malicious_ips</list>
    <description>CTI ALERT: Inbound traffic from known malicious IP $(srcip) ($(srcip.value))</description>
    <mitre><id>T1071</id></mitre>
  </rule>

  <rule id="100301" level="12">
    <list field="dstip" lookup="address_match_key">etc/lists/malicious_ips</list>
    <description>CTI ALERT: Outbound connection to Botnet C2 server $(dstip) ($(dstip.value))</description>
    <mitre><id>T1071</id><id>T1571</id></mitre>
  </rule>
</group>`}</pre>
            </div>
          </div>

          {/* Step 4 */}
          <div className="space-y-1.5">
            <div className="text-slate-400 font-bold flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-600/30 text-cyan-400 flex items-center justify-center text-[10px]">4</span>
              {isTh ? 'ตั้ง Cron Job ให้ Wazuh ดึง IOC สดอัตโนมัติทุกชั่วโมง' : 'Automate Hourly Sync with Linux Cron'}
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-300 overflow-x-auto">
              <pre>{`# ใส่ใน crontab ของ root บน Wazuh Server (crontab -e)
0 * * * * curl -s http://${apiHost}:8000/api/wazuh/lists/ips.cdb -o /var/ossec/etc/lists/malicious_ips && /var/ossec/bin/wazuh-makelists`}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

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
  Zap,
  CheckCircle2,
  ArrowRight,
  Sparkles,
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

  // Integration Mode tab: 'direct' (recommended, no CDB) vs 'cdb' (file-based list)
  const [mode, setMode] = useState<'direct' | 'cdb'>('direct')

  // Live test match
  const [testValue, setTestValue] = useState('')
  const [testResult, setTestResult] = useState<any | null>(null)
  const [testing, setTesting] = useState(false)

  // Sync state
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  // User customizable CTI IP for dynamic command generation
  const defaultHost = window.location.hostname || '127.0.0.1'
  const [ctiServerIp, setCtiServerIp] = useState<string>(defaultHost === 'localhost' ? '127.0.0.1' : defaultHost)

  const backendBase = `http://${ctiServerIp}:8000`

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

  // Pre-formatted code blocks for Direct API mode
  const directBashStep1 = `# กำหนด IP ของเครื่อง CTI Server
CTI_IP="${ctiServerIp}"

# ดาวน์โหลดสคริปต์ตัวเชื่อมต่อตรงจาก API
curl -s http://\${CTI_IP}:8000/api/wazuh/integrator/script -o /var/ossec/integrations/custom-cti

# ให้สิทธิ์การรันสำหรับผู้ใช้ wazuh
chmod 750 /var/ossec/integrations/custom-cti
chown root:wazuh /var/ossec/integrations/custom-cti

# สร้างไฟล์รับ Alert Log
touch /var/ossec/logs/cti-alerts.log
chown wazuh:wazuh /var/ossec/logs/cti-alerts.log
chmod 660 /var/ossec/logs/cti-alerts.log`

  const directOssecConfStep2 = `<ossec_config>

  <!-- 1. สั่งให้ Wazuh ส่ง Alert ทุกตัว (Level >= 5) มาเช็คกับ CTI API โดยตรง -->
  <integration>
    <name>custom-cti</name>
    <hook_url>http://${ctiServerIp}:8000/api/wazuh/webhook/alert</hook_url>
    <level>5</level>
    <alert_format>json</alert_format>
  </integration>

  <!-- 2. สั่งให้ Wazuh อ่านผลวิเคราะห์ที่ยืนยันแล้วกลับมาแสดงเป็น Alert บน Dashboard -->
  <localfile>
    <log_format>json</log_format>
    <location>/var/ossec/logs/cti-alerts.log</location>
  </localfile>

</ossec_config>`

  const directLocalRulesStep3 = `<group name="cti_direct,">

  <!-- กฎแจ้งเตือนระดับวิกฤตเมื่อ CTI API ยืนยันว่าพบภัยคุกคามจริง -->
  <rule id="100500" level="14">
    <decoded_as>json</decoded_as>
    <field name="cti_match">true</field>
    <description>CRITICAL CTI MATCH: $(threat_category) detected on host $(agent_name)! Indicator: $(threat_value) - Action: $(action_recommended)</description>
    <mitre>
      <id>T1071</id>
      <id>T1496</id>
      <id>T1059</id>
    </mitre>
  </rule>

</group>`

  const directTestCommands = `# 1. ทดสอบตรวจจับ IP Cobalt Strike Team Server
curl -s "http://${ctiServerIp}:8000/api/wazuh/ioc/check?value=1.117.74.144"

# 2. ทดสอบตรวจจับโดเมนขุดเหรียญ Coinminer
curl -s "http://${ctiServerIp}:8000/api/wazuh/ioc/check?value=adzcoin.miningpoolhub.com"

# 3. ตรวจดู Log ว่า Wazuh เรียก Integrator หรือไม่
tail -f /var/ossec/logs/integrations.log`

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
              {isTh ? 'เชื่อมต่อ Wazuh SIEM & CTI Platform' : 'Wazuh SIEM Integration & Threat Feeds'}
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono">
                ONLINE
              </span>
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {isTh
              ? 'รองรับทั้งแบบต่อตรง Real-Time API (Direct Webhook) และแบบส่งออกไฟล์ CDB Lists ดั้งเดิม'
              : 'Supports both Direct Real-Time API (Webhook) integration and traditional Wazuh CDB List files'}
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
          <div className="text-xs text-slate-400 font-mono">{isTh ? 'IP อันตราย พร้อมบล็อก' : 'CDB Malicious IPs'}</div>
          <div className="text-2xl font-bold text-cyan-400 font-mono mt-1">
            {loading ? '...' : (stats?.wazuh_cdb_ready_ips ?? 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Cobalt Strike, PHP2Shell & Scanners</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 font-mono">{isTh ? 'โดเมน C2 & Mining Pools' : 'C2 & Mining Domains'}</div>
          <div className="text-2xl font-bold text-purple-400 font-mono mt-1">
            {loading ? '...' : (stats?.wazuh_ready_domains ?? 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">770+ Monero/XMRig Mining Pools</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 font-mono">{isTh ? 'ไฟล์แฮชอันตราย (Hashes)' : 'Malicious Hashes'}</div>
          <div className="text-2xl font-bold text-rose-400 font-mono mt-1">
            {loading ? '...' : (stats?.wazuh_ready_hashes ?? 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Cobalt Strike, PHP2Shell & Miners</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 font-mono">{isTh ? 'URL ฟิชชิ่ง & อันตราย' : 'Phishing URLs'}</div>
          <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
            {loading ? '...' : (stats?.wazuh_ready_urls ?? 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">OpenPhish zero-day feeds</div>
        </div>
      </div>

      {/* Integration Mode Switcher Tab */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-lg w-full sm:w-auto">
          <button
            onClick={() => setMode('direct')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all ${
              mode === 'direct'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-900/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>{isTh ? '1. ต่อตรง Real-Time API (ไม่ใช้ CDB)' : '1. Direct Real-Time API (No CDB)'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
              {isTh ? 'แนะนำ' : 'Recommended'}
            </span>
          </button>

          <button
            onClick={() => setMode('cdb')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all ${
              mode === 'cdb'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-900/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Download className="w-4 h-4 text-cyan-300" />
            <span>{isTh ? '2. ไฟล์ CDB Lists (วิธีดั้งเดิม)' : '2. Wazuh CDB Lists (File-based)'}</span>
          </button>
        </div>

        {/* Dynamic IP input so user commands update automatically */}
        <div className="flex items-center gap-2 w-full sm:w-auto px-2">
          <span className="text-xs text-slate-400 whitespace-nowrap font-mono">
            {isTh ? 'IP เซิร์ฟเวอร์ CTI:' : 'CTI Server IP:'}
          </span>
          <input
            type="text"
            value={ctiServerIp}
            onChange={(e) => setCtiServerIp(e.target.value.trim() || '127.0.0.1')}
            placeholder="192.168.1.50"
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-cyan-300 w-36 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* MODE 1: DIRECT API WEBHOOK (WAZUH_DIRECT_API_GUIDE) */}
      {mode === 'direct' && (
        <div className="space-y-6">
          {/* Architecture Diagram / How It Works */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-cyan-800/40 rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Zap className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    {isTh ? '⚡ การเชื่อมต่อ Wazuh แบบ "ต่อตรง" (Direct API Webhook - ไม่ใช้ CDB)' : 'Wazuh Direct Real-Time API Integration (No CDB)'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isTh
                      ? 'ไม่ต้องดาวน์โหลดไฟล์ ไม่ต้องใช้ wazuh-makelists และไม่ต้องตั้ง Cron Job — Wazuh วิ่งมาสแกนผ่าน API ทันทีแบบเรียลไทม์'
                      : 'Zero CDB file downloads, no compilation needed, real-time query via wazuh-integratord daemon'}
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                Level 14 Critical Alerts
              </span>
            </div>

            {/* Visual Process Flow */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 py-2">
              <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">1. Endpoint Event</span>
                  <div className="text-xs font-semibold text-white mt-1.5">เครื่องลูกข่ายเกิดเหตุ</div>
                  <p className="text-[11px] text-slate-400 mt-1">Sysmon, Network, Windows Event หรือ Linux Audit เกิดขึ้นบนเครื่อง Agent</p>
                </div>
                <ArrowRight className="w-4 h-4 text-cyan-400 hidden md:block self-end mt-2" />
              </div>

              <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-900/50 text-cyan-300">2. Wazuh Manager</span>
                  <div className="text-xs font-semibold text-white mt-1.5">รับ Alert แล้วส่งออกทันที</div>
                  <p className="text-[11px] text-slate-400 mt-1">Wazuh Integrator Daemon เรียกสคริปต์ <code>custom-cti</code> สำหรับ alert level &ge; 5</p>
                </div>
                <ArrowRight className="w-4 h-4 text-cyan-400 hidden md:block self-end mt-2" />
              </div>

              <div className="bg-slate-950/80 border border-cyan-800/60 p-3 rounded-lg flex flex-col justify-between bg-cyan-950/10">
                <div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-800/50 text-cyan-200">3. CTI FastAPI Backend</span>
                  <div className="text-xs font-semibold text-cyan-300 mt-1.5">สแกนเทียบคลัง IOC 4,990+</div>
                  <p className="text-[11px] text-slate-400 mt-1">ตรวจสอบ IP, Domain, Hash ทันที พร้อมระบุ Cobalt Strike / Coinminer</p>
                </div>
                <ArrowRight className="w-4 h-4 text-cyan-400 hidden md:block self-end mt-2" />
              </div>

              <div className="bg-slate-950/80 border border-rose-800/50 p-3 rounded-lg flex flex-col justify-between bg-rose-950/10">
                <div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-900/50 text-rose-300">4. Wazuh Dashboard</span>
                  <div className="text-xs font-semibold text-rose-300 mt-1.5">แจ้งเตือน Rule 100500</div>
                  <p className="text-[11px] text-slate-400 mt-1">เตือนระดับวิกฤต (Level 14) พร้อม Action และ Threat Context ครบถ้วน</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 self-end mt-2" />
              </div>
            </div>

            {/* Why Direct API is Better */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ไม่ต้องคอมไพล์ wazuh-makelists</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">ไม่ต้องกังวลเรื่องไฟล์ CDB เสียหรือลืมรันคำสั่งคอมไพล์</p>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>อัปเดตแบบ Real-time ทันที</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">เพิ่ม IOC ใหม่ใน CTI ปุ๊บ Wazuh ตรวจพบได้ทันทีไม่ต้องรอ Cron</p>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Rich Context ครบวงจร</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">ได้ชื่อภัยคุกคาม ระดับความเสี่ยง และคำแนะนำการตัดวงจร (Containment)</p>
              </div>
            </div>
          </div>

          {/* 3 Steps Setup Guide */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>{isTh ? '🛠️ 3 ขั้นตอนติดตั้งบน Wazuh Manager (ติดตั้งง่าย - พร้อมคำสั่งก็อปปี้)' : '🛠️ 3-Step Setup on Wazuh Manager'}</span>
            </h3>

            {/* Step 1 */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-cyan-600/30 text-cyan-400 flex items-center justify-center text-xs font-bold border border-cyan-500/40">
                    1
                  </span>
                  <div>
                    <h4 className="text-xs md:text-sm font-semibold text-white">
                      {isTh ? 'วางสคริปต์ Integrator บนเครื่อง Wazuh Manager' : 'Install Integrator Script on Wazuh Manager'}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      SSH เข้าเครื่อง Wazuh Manager (Linux) แล้วรันคำสั่งดาวน์โหลดสคริปต์และสร้างไฟล์ Log
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(directBashStep1, 'step1_bash')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono transition-colors"
                >
                  {copiedKey === 'step1_bash' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'step1_bash' ? 'คัดลอกแล้ว!' : 'Copy Script'}</span>
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/90 text-slate-300 font-mono text-xs overflow-x-auto">
                <pre>{directBashStep1}</pre>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-cyan-600/30 text-cyan-400 flex items-center justify-center text-xs font-bold border border-cyan-500/40">
                    2
                  </span>
                  <div>
                    <h4 className="text-xs md:text-sm font-semibold text-white">
                      {isTh ? 'ตั้งค่าเปิดใช้งานใน /var/ossec/etc/ossec.conf' : 'Enable in /var/ossec/etc/ossec.conf'}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      เพิ่มบล็อก <code>&lt;integration&gt;</code> และ <code>&lt;localfile&gt;</code> ภายในแท็ก <code>&lt;ossec_config&gt;</code>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(directOssecConfStep2, 'step2_conf')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono transition-colors"
                >
                  {copiedKey === 'step2_conf' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'step2_conf' ? 'คัดลอกแล้ว!' : 'Copy XML'}</span>
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/90 text-slate-300 font-mono text-xs overflow-x-auto">
                <pre>{directOssecConfStep2}</pre>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-cyan-600/30 text-cyan-400 flex items-center justify-center text-xs font-bold border border-cyan-500/40">
                    3
                  </span>
                  <div>
                    <h4 className="text-xs md:text-sm font-semibold text-white">
                      {isTh ? 'เพิ่ม Alert Rule 100500 ใน /var/ossec/etc/rules/local_rules.xml' : 'Add Rule 100500 in local_rules.xml'}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      เมื่อผลวิเคราะห์ CTI API คืนค่า <code>cti_match: true</code> จะส่ง Alert Level 14 Critical ขึ้น Dashboard ทันที
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(directLocalRulesStep3, 'step3_rules')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono transition-colors"
                >
                  {copiedKey === 'step3_rules' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'step3_rules' ? 'คัดลอกแล้ว!' : 'Copy Rule'}</span>
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/90 text-slate-300 font-mono text-xs overflow-x-auto">
                <pre className="text-emerald-400">{directLocalRulesStep3}</pre>
              </div>
            </div>

            {/* Step 4 & Verification */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-cyan-600/30 text-cyan-400 flex items-center justify-center text-xs font-bold border border-cyan-500/40">
                    4
                  </span>
                  <div>
                    <h4 className="text-xs md:text-sm font-semibold text-white">
                      {isTh ? 'รีสตาร์ต Wazuh Manager และทดสอบการทำงาน' : 'Restart Wazuh Manager & Test'}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      รันคำสั่งรีสตาร์ต Wazuh Manager และทดสอบยิง curl ตรวจสอบสถานะการเชื่อมต่อ
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(`systemctl restart wazuh-manager\n\n${directTestCommands}`, 'step4_test')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono transition-colors"
                >
                  {copiedKey === 'step4_test' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'step4_test' ? 'คัดลอกแล้ว!' : 'Copy Commands'}</span>
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/90 text-slate-300 font-mono text-xs overflow-x-auto space-y-2">
                <div className="text-amber-400"># รีสตาร์ต Wazuh Manager</div>
                <div>systemctl restart wazuh-manager</div>
                <div className="text-amber-400 pt-2"># คำสั่งทดสอบยิง API จากเครื่อง Wazuh Manager ตรงๆ:</div>
                <pre>{directTestCommands}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: WAZUH CDB LISTS (TRADITIONAL FILE LISTS) */}
      {mode === 'cdb' && (
        <div className="space-y-6">
          {/* Wazuh CDB Download Links Grid */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-cyan-400" />
                {isTh ? 'ลิงก์ดาวน์โหลด Wazuh CDB Lists (คัดลอกหรือกดดาวน์โหลด)' : 'Wazuh CDB List Endpoints'}
              </h2>
              <span className="text-[11px] font-mono text-slate-400">format: key:value</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

          {/* Step-by-Step Wazuh Configuration Instructions (CDB) */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">
                {isTh ? 'วิธีติดตั้ง CDB List บน Wazuh Server (Cron + wazuh-makelists)' : 'Wazuh Production Setup Instructions (CDB List)'}
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
curl -s http://${ctiServerIp}:8000/api/wazuh/lists/ips.cdb -o /var/ossec/etc/lists/malicious_ips

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
0 * * * * curl -s http://${ctiServerIp}:8000/api/wazuh/lists/ips.cdb -o /var/ossec/etc/lists/malicious_ips && curl -s http://${ctiServerIp}:8000/api/wazuh/lists/domains.cdb -o /var/ossec/etc/lists/malicious_domains && curl -s http://${ctiServerIp}:8000/api/wazuh/lists/hashes.cdb -o /var/ossec/etc/lists/malicious_hashes && /var/ossec/bin/wazuh-makelists`}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
              placeholder="e.g. 1.117.74.144 or adzcoin.miningpoolhub.com"
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
        <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
          <span>{isTh ? 'ตัวอย่างทดสอบ:' : 'Quick tests:'}</span>
          <button
            type="button"
            onClick={() => setTestValue('92.118.112.100')}
            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded font-mono text-[10px]"
          >
            92.118.112.100 (PHP2Shell Scanner)
          </button>
          <button
            type="button"
            onClick={() => setTestValue('1.117.74.144')}
            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded font-mono text-[10px]"
          >
            1.117.74.144 (Cobalt Strike C2)
          </button>
          <button
            type="button"
            onClick={() => setTestValue('adzcoin.miningpoolhub.com')}
            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded font-mono text-[10px]"
          >
            adzcoin.miningpoolhub.com (Mining Pool)
          </button>
          <button
            type="button"
            onClick={() => setTestValue('checkphp2shell.com')}
            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded font-mono text-[10px]"
          >
            checkphp2shell.com (PHP2Shell Domain)
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

      {/* Specialized Rules: Coinminer, Cobalt Strike & PHP2Shell */}
      <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              {isTh ? '🛡️ กฎตรวจจับ Coinminer, Cobalt Strike & PHP2Shell WebShell พิเศษ (Custom Wazuh Rules)' : 'Specialized Coinminer, Cobalt Strike & PHP2Shell Detection Rules'}
            </h2>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800/50">
            High Priority
          </span>
        </div>

        <p className="text-xs text-slate-300">
          {isTh
            ? 'คัดลอก XML ด้านล่างนี้ไปวางไว้ใน /var/ossec/etc/rules/local_rules.xml บนเครื่อง Wazuh เพื่อตรวจจับการขุดเหรียญ, Cobalt Strike Beacon และการเจาะระบบด้วย PHP2Shell (CVE-2026-109618 / CVE-2026-109619) ทันที'
            : 'Copy and paste the XML below into /var/ossec/etc/rules/local_rules.xml on Wazuh Manager to catch Coinminers, Cobalt Strike, and PHP2Shell WebShells immediately.'}
        </p>

        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-slate-300 font-mono text-xs overflow-x-auto space-y-3">
          <div className="flex items-center justify-between text-slate-500 border-b border-slate-800 pb-1.5">
            <span>local_rules.xml</span>
            <button
              onClick={() => copyToClipboard(`<!-- Coinminer, Cobalt Strike & PHP2Shell Detection Group -->
<group name="coinminer,cobalt_strike,php2shell,cti_intel,">

  <!-- 1. Coinminer: Outbound traffic to Monero / XMRig Mining Pool Domains -->
  <rule id="100400" level="13">
    <list field="data.win.eventdata.queryName" lookup="match_key">etc/lists/malicious_domains</list>
    <description>CRITICAL COINMINER: Host requested known Cryptocurrency Mining Pool $(data.win.eventdata.queryName)</description>
    <mitre><id>T1496</id></mitre>
  </rule>

  <!-- 2. Coinminer: Known Stratum Protocol Mining Ports -->
  <rule id="100401" level="11">
    <if_group>firewall,sysmon</if_group>
    <match>3333|4444|5555|7777|8008|9000|14444</match>
    <description>SUSPICIOUS COINMINER: Outbound traffic on default Stratum Mining Pool Port</description>
    <mitre><id>T1496</id></mitre>
  </rule>

  <!-- 3. Coinminer: Suspicious Process Creation (XMRig / Kinsing / kswapd0) -->
  <rule id="100402" level="12">
    <if_group>sysmon_process_create</if_group>
    <match>xmrig|minerd|kworker34|kswapd0|sysupdate|monero</match>
    <description>COINMINER PROCESS DETECTED: Execution of known cryptocurrency miner binary</description>
    <mitre><id>T1496</id></mitre>
  </rule>

  <!-- 4. Cobalt Strike: Connection to known Team Server / Beacon IP -->
  <rule id="100410" level="14">
    <list field="dstip" lookup="address_match_key">etc/lists/malicious_ips</list>
    <description>ALERT CRITICAL: Outbound connection to Cobalt Strike C2 / Team Server $(dstip) ($(dstip.value))</description>
    <mitre><id>T1071</id><id>T1571</id></mitre>
  </rule>

  <!-- 5. Cobalt Strike: Default Named Pipes Detection (Sysmon Event ID 17/18) -->
  <rule id="100411" level="13">
    <if_group>sysmon_event_17,sysmon_event_18</if_group>
    <match>msagent_|status_|postex_</match>
    <description>COBALT STRIKE NAMED PIPE: Adversary Beacon lateral movement pipe observed</description>
    <mitre><id>T1055</id><id>T1021</id></mitre>
  </rule>

  <!-- 6. Cobalt Strike: Beacon Payload Hash Match (FIM / Sysmon) -->
  <rule id="100412" level="14">
    <list field="data.win.eventdata.hashes" lookup="match_key">etc/lists/malicious_hashes</list>
    <description>CRITICAL ALERT: File hash matches confirmed Cobalt Strike Beacon artifact</description>
    <mitre><id>T1059</id><id>T1055</id></mitre>
  </rule>

  <!-- 7. PHP2Shell (CVE-2026-109618): Traffic from known exploit scanner or staging IP -->
  <rule id="100420" level="14">
    <list field="srcip" lookup="address_match_key">etc/lists/malicious_ips</list>
    <description>ALERT CRITICAL: Inbound exploit attempt from confirmed PHP2Shell scanner $(srcip)</description>
    <mitre><id>T1190</id><id>T1059</id></mitre>
  </rule>

  <!-- 8. PHP2Shell WebShell: PHP-FPM / Apache worker spawning interactive shell -->
  <rule id="100421" level="14">
    <if_group>sysmon_process_create</if_group>
    <match>php-fpm|apache2|httpd|nginx</match>
    <regex>\/bin\/sh|\/bin\/bash|cmd\.exe|powershell</regex>
    <description>CRITICAL WEBSHELL EXECUTION: Web server worker process spawned interactive shell (Possible PHP2Shell RCE)</description>
    <mitre><id>T1505.003</id><id>T1059.004</id></mitre>
  </rule>

  <!-- 9. PHP2Shell WebShell Payload Hash Match -->
  <rule id="100422" level="14">
    <list field="data.win.eventdata.hashes" lookup="match_key">etc/lists/malicious_hashes</list>
    <description>CRITICAL ALERT: File hash matches confirmed PHP2Shell reverse shell payload artifact</description>
    <mitre><id>T1505.003</id></mitre>
  </rule>

</group>`, 'custom_rules')}
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-sans text-xs"
            >
              {copiedKey === 'custom_rules' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'custom_rules' ? 'Copied XML!' : 'Copy Rules XML'}</span>
            </button>
          </div>

          <pre className="text-emerald-400">{`<!-- 1. ตรวจจับการเชื่อมต่อไปยัง Monero/XMRig Mining Pools (770+ โดเมน) -->
<rule id="100400" level="13">
  <list field="data.win.eventdata.queryName" lookup="match_key">etc/lists/malicious_domains</list>
  <description>CRITICAL COINMINER: Host requested known Mining Pool $(data.win.eventdata.queryName)</description>
  <mitre><id>T1496</id></mitre>
</rule>

<!-- 2. ตรวจจับทราฟฟิกพอร์ตขุดเหรียญ Stratum (3333, 4444, 5555, 7777, 14444) -->
<rule id="100401" level="11">
  <match>3333|4444|5555|7777|8008|9000|14444</match>
  <description>SUSPICIOUS COINMINER: Outbound traffic on default Stratum Mining Port</description>
  <mitre><id>T1496</id></mitre>
</rule>

<!-- 3. ตรวจจับ Process ขุดเหรียญ (xmrig, minerd, kswapd0, sysupdate) -->
<rule id="100402" level="12">
  <match>xmrig|minerd|kworker34|kswapd0|sysupdate|monero</match>
  <description>COINMINER PROCESS DETECTED: Execution of known cryptocurrency miner binary</description>
  <mitre><id>T1496</id></mitre>
</rule>

<!-- 4. ตรวจจับการเชื่อมต่อไปยัง Cobalt Strike Team Server / C2 IP (215+ รายการ) -->
<rule id="100410" level="14">
  <list field="dstip" lookup="address_match_key">etc/lists/malicious_ips</list>
  <description>CRITICAL ALERT: Outbound connection to Cobalt Strike Team Server $(dstip) ($(dstip.value))</description>
  <mitre><id>T1071</id><id>T1571</id></mitre>
</rule>

<!-- 5. ตรวจจับ Named Pipe ของ Cobalt Strike (Sysmon Event ID 17/18: msagent_*, status_*) -->
<rule id="100411" level="13">
  <match>msagent_|status_|postex_</match>
  <description>COBALT STRIKE NAMED PIPE: Adversary Beacon named pipe observed</description>
  <mitre><id>T1055</id><id>T1021</id></mitre>
</rule>

<!-- 6. ตรวจจับแฮชไฟล์ของ Cobalt Strike Beacon (102+ แฮช) -->
<rule id="100412" level="14">
  <list field="data.win.eventdata.hashes" lookup="match_key">etc/lists/malicious_hashes</list>
  <description>CRITICAL ALERT: File hash matches confirmed Cobalt Strike Beacon payload</description>
  <mitre><id>T1059</id><id>T1055</id></mitre>
</rule>

<!-- 7. ตรวจจับ Inbound Traffic จาก PHP2Shell Scanner / Exploit Staging IP (290+ รายการ) -->
<rule id="100420" level="14">
  <list field="srcip" lookup="address_match_key">etc/lists/malicious_ips</list>
  <description>CRITICAL PHP2SHELL: Inbound exploit attempt from confirmed scanner $(srcip)</description>
  <mitre><id>T1190</id><id>T1059</id></mitre>
</rule>

<!-- 8. ตรวจจับ PHP Worker Process แอบ Spawn Interactive Shell (/bin/sh, bash) -->
<rule id="100421" level="14">
  <match>php-fpm|apache2|httpd|nginx</match>
  <regex>\/bin\/sh|\/bin\/bash|cmd\.exe|powershell</regex>
  <description>CRITICAL WEBSHELL EXECUTION: Web server worker process spawned interactive shell</description>
  <mitre><id>T1505.003</id><id>T1059.004</id></mitre>
</rule>

<!-- 9. ตรวจจับแฮชไฟล์ Reverse Shell / Payload ของ PHP2Shell (SHA256) -->
<rule id="100422" level="14">
  <list field="data.win.eventdata.hashes" lookup="match_key">etc/lists/malicious_hashes</list>
  <description>CRITICAL ALERT: File hash matches confirmed PHP2Shell reverse shell payload</description>
  <mitre><id>T1505.003</id></mitre>
</rule>`}</pre>
        </div>
      </div>
    </div>
  )
}

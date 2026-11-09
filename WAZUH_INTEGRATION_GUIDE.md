# 📖 คู่มือการเชื่อมต่อ CTI & IOC Repository กับ Wazuh SIEM (Production Guide)

คู่มือนี้อธิบายขั้นตอนการนำข้อมูล Threat Intelligence (IOCs กว่า 4,990+ รายการ) ไปเชื่อมต่อกับ **Wazuh Manager** เพื่อตรวจจับการโจมตีทางไซเบอร์ โดยเฉพาะ **Coinminer (XMRig)** และ **Cobalt Strike (Beacon / Team Server)** แบบอัตโนมัติ

---

## 🏗️ สถาปัตยกรรมการเชื่อมต่อ (Architecture Overview)

ระบบรองรับการเชื่อมต่อกับ Wazuh **2 รูปแบบหลัก**:

```
+-----------------------------------------------------------+
|          SOC CTI & IOC Repository (FastAPI Backend)       |
|                 http://<CTI_SERVER_IP>:8000               |
+-----------------------------------------------------------+
        |                                           ^
        | [วิธีที่ 1] CDB Lists Download            | [วิธีที่ 2] Direct Webhook / API
        | (malicious_ips / domains / hashes)       | (wazuh-integratord)
        v                                           |
+-----------------------------------------------------------+
|                       Wazuh Manager                       |
|                      (/var/ossec/)                        |
|                                                           |
| 1. /var/ossec/etc/lists/ (Compiled CDB Binary)            |
| 2. /var/ossec/etc/rules/local_rules.xml (Detection Rules) |
| 3. /var/ossec/integrations/custom-cti (Integrator Daemon) |
+-----------------------------------------------------------+
```

---

## วิธีที่ 1: การใช้ Wazuh CDB Lists (แนะนำสำหรับ Rule Matching ความเร็วสูง)

Wazuh มีฟังก์ชัน Constant DataBase (CDB) ที่โหลดฐานข้อมูล IOC เข้า Memory ทำให้ตรวจจับทราฟฟิกและ Log ได้ในระดับ Microsecond โดยไม่กิน CPU

### ขั้นตอนที่ 1: ดาวน์โหลด List จาก CTI ไปที่ Wazuh Manager
ล็อกอินเข้าไปที่เครื่อง **Wazuh Manager (Linux)** ผ่าน SSH แล้วรันคำสั่ง:

```bash
# กำหนด IP ของเครื่อง CTI Server
CTI_IP="<IP_เครื่อง_CTI_SERVER>"

# ดาวน์โหลดไฟล์ทั้ง 3 รายการ
curl -s http://${CTI_IP}:8000/api/wazuh/lists/ips.cdb -o /var/ossec/etc/lists/malicious_ips
curl -s http://${CTI_IP}:8000/api/wazuh/lists/domains.cdb -o /var/ossec/etc/lists/malicious_domains
curl -s http://${CTI_IP}:8000/api/wazuh/lists/hashes.cdb -o /var/ossec/etc/lists/malicious_hashes

# ตั้งค่าสิทธิ์ไฟล์ให้ Wazuh อ่านได้
chown root:wazuh /var/ossec/etc/lists/malicious_*
chmod 660 /var/ossec/etc/lists/malicious_*

# คอมไพล์ไฟล์เป็นรูปแบบ Binary CDB ของ Wazuh
/var/ossec/bin/wazuh-makelists
```

> **ข้อสังเกตสำคัญ:** เมื่อคอมไพล์เสร็จ Wazuh จะสร้างไฟล์ `.cdb` ต่อท้ายเอง เช่น `/var/ossec/etc/lists/malicious_ips.cdb`

---

### ขั้นตอนที่ 2: เปิดใช้งาน List ใน `/var/ossec/etc/ossec.conf`

แก้ไขไฟล์ `/var/ossec/etc/ossec.conf` บนเครื่อง Wazuh Manager:

```xml
<ossec_config>
  <ruleset>
    <!-- ห้ามใส่ .cdb เพราะ Wazuh จะเติมให้อัตโนมัติ -->
    <list>etc/lists/malicious_ips</list>
    <list>etc/lists/malicious_domains</list>
    <list>etc/lists/malicious_hashes</list>
  </ruleset>
</ossec_config>
```

---

### ขั้นตอนที่ 3: เพิ่มกฎตรวจจับใน `/var/ossec/etc/rules/local_rules.xml`

เพิ่มกลุ่มกฎด้านล่างนี้ลงในไฟล์ `/var/ossec/etc/rules/local_rules.xml`:

```xml
<!-- ======================================================== -->
<!-- กฎตรวจจับ CTI: Coinminer, Cobalt Strike และ Malicious IOCs -->
<!-- ======================================================== -->
<group name="cti_intel,coinminer,cobalt_strike,">

  <!-- 1. ตรวจจับ IP ปลายทางที่เชื่อมต่อไปยัง Botnet / Cobalt Strike C2 (2,100+ IPs) -->
  <rule id="100300" level="12">
    <list field="dstip" lookup="address_match_key">etc/lists/malicious_ips</list>
    <description>CTI ALERT: Outbound connection to known C2 server $(dstip) ($(dstip.value))</description>
    <mitre><id>T1071</id><id>T1571</id></mitre>
  </rule>

  <!-- 2. ตรวจจับ IP ต้นทางที่เป็น Attacker / Scanner ขาเข้า -->
  <rule id="100301" level="10">
    <list field="srcip" lookup="address_match_key">etc/lists/malicious_ips</list>
    <description>CTI ALERT: Inbound traffic from known threat actor IP $(srcip) ($(srcip.value))</description>
    <mitre><id>T1071</id></mitre>
  </rule>

  <!-- 3. ตรวจจับการขุดเหรียญ Coinminer: มีการร้องขอ DNS ไปยัง Mining Pools (770+ โดเมน) -->
  <rule id="100400" level="13">
    <list field="data.win.eventdata.queryName" lookup="match_key">etc/lists/malicious_domains</list>
    <description>CRITICAL COINMINER: Host requested known Mining Pool domain $(data.win.eventdata.queryName)</description>
    <mitre><id>T1496</id></mitre>
  </rule>

  <!-- 4. ตรวจจับทราฟฟิกพอร์ตขุดเหรียญ Stratum Protocol (3333, 4444, 5555, 7777, 14444) -->
  <rule id="100401" level="11">
    <match>3333|4444|5555|7777|8008|9000|14444</match>
    <description>SUSPICIOUS COINMINER: Outbound traffic detected on default Stratum Mining Pool Port</description>
    <mitre><id>T1496</id></mitre>
  </rule>

  <!-- 5. ตรวจจับ Process การขุดเหรียญ (xmrig, minerd, kswapd0, sysupdate) -->
  <rule id="100402" level="12">
    <match>xmrig|minerd|kworker34|kswapd0|sysupdate|monero</match>
    <description>COINMINER PROCESS DETECTED: Execution of known cryptocurrency miner binary</description>
    <mitre><id>T1496</id></mitre>
  </rule>

  <!-- 6. ตรวจจับ Cobalt Strike Named Pipe (Sysmon Event ID 17/18: msagent_*, status_*, postex_*) -->
  <rule id="100411" level="13">
    <match>msagent_|status_|postex_</match>
    <description>COBALT STRIKE NAMED PIPE: Adversary Beacon lateral movement pipe observed</description>
    <mitre><id>T1055</id><id>T1021</id></mitre>
  </rule>

  <!-- 7. ตรวจจับแฮชไฟล์อันตรายของ Cobalt Strike และ มัลแวร์ (1,150+ แฮช) ผ่าน Sysmon / FIM -->
  <rule id="100412" level="14">
    <list field="data.win.eventdata.hashes" lookup="match_key">etc/lists/malicious_hashes</list>
    <description>CRITICAL ALERT: File hash matches confirmed Cobalt Strike Beacon or Malware artifact</description>
    <mitre><id>T1059</id><id>T1055</id></mitre>
  </rule>

</group>
```

---

### ขั้นตอนที่ 4: ตั้ง Cron Job ให้อัปเดต IOC อัตโนมัติทุกชั่วโมง
บนเครื่อง Wazuh Manager รันคำสั่ง `crontab -e` ของ `root` แล้วใส่บรรทัดนี้:

```bash
0 * * * * curl -s http://<CTI_SERVER_IP>:8000/api/wazuh/lists/ips.cdb -o /var/ossec/etc/lists/malicious_ips && curl -s http://<CTI_SERVER_IP>:8000/api/wazuh/lists/domains.cdb -o /var/ossec/etc/lists/malicious_domains && curl -s http://<CTI_SERVER_IP>:8000/api/wazuh/lists/hashes.cdb -o /var/ossec/etc/lists/malicious_hashes && /var/ossec/bin/wazuh-makelists
```

---

## วิธีที่ 2: การใช้ Wazuh Integrator Webhook (เชื่อมต่อ REST API อัตโนมัติ)

Wazuh มีโมดูล `wazuh-integratord` ที่สามารถส่ง Alert ทุกตัวที่เกิดขึ้นไปยัง External API แบบอัตโนมัติ เพื่อให้ระบบ CTI ของเราสแกนหา IOC และแจ้งกลับ

### ขั้นตอนที่ 1: ติดตั้งสคริปต์ Integrator บนเครื่อง Wazuh
รันคำสั่งบนเครื่อง Wazuh Manager:

```bash
# ดาวน์โหลดสคริปต์จาก CTI API
curl -s http://<CTI_SERVER_IP>:8000/api/wazuh/integrator/script -o /var/ossec/integrations/custom-cti

# ให้สิทธิ์ Execute
chmod 750 /var/ossec/integrations/custom-cti
chown root:wazuh /var/ossec/integrations/custom-cti
```

### ขั้นตอนที่ 2: ตั้งค่า `<integration>` ใน `/var/ossec/etc/ossec.conf`
เพิ่มบล็อกคอนฟิกนี้ใน `/var/ossec/etc/ossec.conf`:

```xml
<ossec_config>
  <integration>
    <name>custom-cti</name>
    <hook_url>http://<CTI_SERVER_IP>:8000/api/wazuh/webhook/alert</hook_url>
    <level>7</level>
    <alert_format>json</alert_format>
  </integration>
</ossec_config>
```

> **คำอธิบาย:** ทุก Alert ที่มีระดับความรุนแรง Level 7 ขึ้นไป จะถูกส่งมาให้ CTI API สแกน IP, Hashes และ Domain โดยอัตโนมัติ

### ขั้นตอนที่ 3: รีสตาร์ต Wazuh Manager
```bash
systemctl restart wazuh-manager
```

---

## วิธีที่ 3: การเรียกใช้ Direct REST API สำหรับ Active Response / Script ภายนอก

หากมี Bash / Python สคริปต์ที่ต้องการตรวจสอบ IP หรือ Hash แบบรายตัว:

### 1. Instant IOC Check (GET)
```bash
curl -s "http://<CTI_SERVER_IP>:8000/api/wazuh/ioc/check?value=1.117.74.144"
```
**ตัวอย่างการตอบกลับ (JSON):**
```json
{
  "indicator": "1.117.74.144",
  "malicious": true,
  "ioc_type": "IPv4",
  "severity": "CRITICAL",
  "threat_category": "Cobalt Strike C2 / Beacon",
  "action": "BLOCK",
  "confidence": "High"
}
```

### 2. Batch Check หลายรายการพร้อมกัน (POST)
```bash
curl -X POST "http://<CTI_SERVER_IP>:8000/api/wazuh/ioc/check-bulk" \
     -H "Content-Type: application/json" \
     -d '{"values": ["1.117.74.144", "adzcoin.miningpoolhub.com", "8.8.8.8"]}'
```

---

## 🧪 การทดสอบระบบ (Verification & Testing)

### 1. ทดสอบกฎบน Wazuh ด้วย `wazuh-logtest`
รันคำสั่งบนเครื่อง Wazuh:
```bash
/var/ossec/bin/wazuh-logtest
```
แล้วทดลองพิมพ์ Log จำลอง:
```json
{"srcip":"1.117.74.144","dstip":"10.0.0.5"}
```
**ผลลัพธ์ที่คาดหวัง:**
```
**Phase 3: Completed filtering (rules).
   id: '100301'
   level: '10'
   description: 'CTI ALERT: Inbound traffic from known threat actor IP 1.117.74.144'
```

### 2. ตรวจสอบ Log การทำงานของ Integrator
```bash
tail -f /var/ossec/logs/integrations.log
tail -f /var/ossec/logs/ossec.log
```

---

## 📌 Checklist ตรวจสอบความถูกต้อง (Production Checklist)
- [ ] เครื่อง CTI Server รัน Backend ด้วยพอร์ต 8000 (`uvicorn app.main:app --host 0.0.0.0 --port 8000`)
- [ ] เปิด Firewall พอร์ต 8000 บนเครื่อง CTI ให้เครื่อง Wazuh Manager ยิงเข้ามาได้
- [ ] รัน `/var/ossec/bin/wazuh-makelists` สำเร็จ (มีไฟล์ `.cdb` อยู่ใน `/var/ossec/etc/lists/`)
- [ ] ชื่อลิสต์ใน `ossec.conf` ไม่มีนามสกุล `.cdb` (เช่น `<list>etc/lists/malicious_ips</list>`)
- [ ] รัน `systemctl restart wazuh-manager` เพื่อให้คอนฟิกมีผล

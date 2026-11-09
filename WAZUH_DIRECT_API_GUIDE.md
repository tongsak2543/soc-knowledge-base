# ⚡ คู่มือการเชื่อมต่อ Wazuh แบบ "ต่อตรง" (Direct API Webhook - ไม่ใช้ CDB)

หากคุณ **ไม่ต้องการดาวน์โหลดไฟล์ CDB ไม่ต้องการคอมไพล์ `wazuh-makelists` และไม่ต้องการตั้ง Cron Job** คุณสามารถให้ **Wazuh วิ่งมาเรียก API ของระบบเราโดยตรงแบบเรียลไทม์ (Real-Time API)** ได้ทันทีผ่านโมดูล `wazuh-integratord`

---

## 💡 กลไกการทำงานเมื่อ "ต่อตรง" (How It Works):

```
+-----------------------------------------------------------------------------------+
| 1. เครื่องลูกข่ายเกิดเหตุ (Sysmon / Network / Windows Event / Linux Audit)         |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 2. Wazuh Manager รับ Log และเรียกสคริปต์ /var/ossec/integrations/custom-cti        |
+-----------------------------------------------------------------------------------+
                                         |
                                         v (ยิง HTTP POST ตรงเข้าหา CTI API)
+-----------------------------------------------------------------------------------+
| 3. CTI FastAPI Backend (http://<CTI_IP>:8000/api/wazuh/webhook/alert)             |
|    - สแกน IP, Hashes, Domains ทันที เทียบกับคลัง IOC กว่า 4,990+ รายการ            |
|    - หากตรงกับ Cobalt Strike C2 หรือ Coinminer จะส่งผลลัพธ์กลับมาทันที             |
+-----------------------------------------------------------------------------------+
                                         |
                                         v (พบภัยคุกคาม!)
+-----------------------------------------------------------------------------------+
| 4. แจ้งเตือนขึ้น Wazuh Dashboard ทันทีเป็น Rule 100500 (Level 14 - CRITICAL CTI)  |
+-----------------------------------------------------------------------------------+
```

---

## 🛠️ ขั้นตอนติดตั้งบน Wazuh Manager (3 ขั้นตอนเสร็จ - ไม่ใช้ CDB)

### ขั้นที่ 1: วางสคริปต์ Integrator บนเครื่อง Wazuh Manager
ล็อกอิน SSH เข้าเครื่อง Wazuh Manager (Linux) แล้วรันคำสั่ง:

```bash
# กำหนด IP ของเครื่องที่รันระบบ CTI นี้
CTI_IP="<IP_เครื่อง_CTI_SERVER>"

# ดาวน์โหลดสคริปต์ตัวเชื่อมต่อตรงจาก API
curl -s http://${CTI_IP}:8000/api/wazuh/integrator/script -o /var/ossec/integrations/custom-cti

# ให้สิทธิ์การรันสำหรับผู้ใช้ wazuh
chmod 750 /var/ossec/integrations/custom-cti
chown root:wazuh /var/ossec/integrations/custom-cti

# สร้างไฟล์รับ Alert Log
touch /var/ossec/logs/cti-alerts.log
chown wazuh:wazuh /var/ossec/logs/cti-alerts.log
chmod 660 /var/ossec/logs/cti-alerts.log
```

---

### ขั้นที่ 2: ตั้งค่าเปิดใช้งานใน `/var/ossec/etc/ossec.conf`
เปิดไฟล์ `/var/ossec/etc/ossec.conf` บนเครื่อง Wazuh Manager แล้วเพิ่มคอนฟิก 2 บล็อกนี้:

```xml
<ossec_config>

  <!-- 1. สั่งให้ Wazuh ส่ง Alert ทุกตัว (Level >= 5) มาเช็คกับ CTI API โดยตรง -->
  <integration>
    <name>custom-cti</name>
    <hook_url>http://<IP_เครื่อง_CTI_SERVER>:8000/api/wazuh/webhook/alert</hook_url>
    <level>5</level>
    <alert_format>json</alert_format>
  </integration>

  <!-- 2. สั่งให้ Wazuh อ่านผลวิเคราะห์ที่ยืนยันแล้วกลับมาแสดงเป็น Alert บน Dashboard -->
  <localfile>
    <log_format>json</log_format>
    <location>/var/ossec/logs/cti-alerts.log</location>
  </localfile>

</ossec_config>
```

> ⚠️ **หมายเหตุ:** อย่าลืมเปลี่ยน `<IP_เครื่อง_CTI_SERVER>` ให้เป็น IP ของเครื่องที่รัน Backend FastAPI (เช่น `192.168.1.50`)

---

### ขั้นที่ 3: เพิ่ม Rule แสดง Alert บน Dashboard ใน `/var/ossec/etc/rules/local_rules.xml`
เปิดไฟล์ `/var/ossec/etc/rules/local_rules.xml` แล้วเพิ่มกฎนี้:

```xml
<group name="cti_direct,">

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

</group>
```

---

### ขั้นที่ 4: รีสตาร์ต Wazuh Manager
```bash
systemctl restart wazuh-manager
```

---

## 🧪 ทดสอบระบบว่าต่อตรงสำเร็จหรือไม่

### 1. ทดสอบยิง API จากเครื่อง Wazuh Manager ตรงๆ
รันคำสั่ง curl เพื่อดูว่าเครื่อง Wazuh สามารถคุยกับเครื่อง CTI ได้หรือไม่:
```bash
# ทดสอบถาม IP ของ Cobalt Strike
curl -s "http://<IP_เครื่อง_CTI_SERVER>:8000/api/wazuh/ioc/check?value=1.117.74.144"
```
**ผลลัพธ์ที่ได้ทันที:**
```json
{
  "indicator": "1.117.74.144",
  "malicious": true,
  "ioc_type": "IPv4",
  "severity": "CRITICAL",
  "threat_category": "Cobalt Strike C2 / Beacon",
  "action": "BLOCK"
}
```

```bash
# ทดสอบถามโดเมนขุดเหรียญ Coinminer
curl -s "http://<IP_เครื่อง_CTI_SERVER>:8000/api/wazuh/ioc/check?value=adzcoin.miningpoolhub.com"
```
**ผลลัพธ์ที่ได้ทันที:**
```json
{
  "indicator": "adzcoin.miningpoolhub.com",
  "malicious": true,
  "ioc_type": "Domain",
  "severity": "HIGH",
  "threat_category": "Cryptocurrency Miner (XMRig)",
  "action": "BLOCK"
}
```

### 2. ตรวจดู Log ว่า Wazuh เรียก Integrator หรือไม่
```bash
tail -f /var/ossec/logs/integrations.log
```
เมื่อมีอีเวนต์ทราฟฟิกหรือ Log เกิดขึ้น สคริปต์จะยิง HTTP POST ตรงเข้าหา FastAPI CTI Backend และพิมพ์:
```
[CTI HIT] Threat detected on host Windows-PC: Cobalt Strike C2 / Beacon (1.117.74.144)
```

---

## 🎯 สรุปข้อดีของการ "ต่อตรง" (No CDB):
1. **ไม่ต้องดาวน์โหลดไฟล์ ไม่ต้องใช้คำสั่ง compile**: ข้อมูลในฐานข้อมูล SQLite ถูกค้นหาแบบสดๆ ทันที
2. **อัปเดตแบบ Real-time**: เมื่อคลัง CTI มีการเพิ่ม IOC ใหม่ (เช่น แอด Cobalt Strike C2 หรือ Mining Pool เพิ่ม) Wazuh จะตรวจพบได้ทันทีโดยไม่ต้องไปกดคอมไพล์ใหม่บนเครื่อง Wazuh
3. **ได้รับข้อมูลบริบทภัยคุกคามแบบเต็ม (Rich Threat Context)**: Wazuh จะได้ชื่อแคมเปญ, ระดับความรุนแรง, หมวดหมู่ MISP, และคำแนะนำในการกักกัน (Containment Action) ส่งตรงถึงหน้าแดชบอร์ด

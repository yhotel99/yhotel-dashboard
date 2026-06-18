import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { RegistrationFormData } from "@/lib/booking-registration/types";
import { formatAmountPlain } from "@/lib/booking-registration/build-registration-form-data";
import { REGISTRATION_BLANK } from "@/lib/booking-registration/constants";
import { formatPaymentCheckboxMark, formatRegistrationCompanyLine } from "@/lib/booking-registration/formatters";
import { REGISTRATION_LOGO_PATH } from "@/lib/booking-registration/registration-logo-path";

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSans",
    fontSize: 9,
    padding: 28,
    color: "#111",
    lineHeight: 1.4,
  },
  center: { textAlign: "center" },
  bold: { fontWeight: 700 },
  title: { fontSize: 11, fontWeight: 700, textTransform: "uppercase" },
  sectionTitle: {
    marginTop: 10,
    marginBottom: 4,
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  row: { marginBottom: 3 },
  table: {
    width: "100%",
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#999",
  },
  tableRow: { flexDirection: "row" },
  tableHeader: { backgroundColor: "#f3f3f3", fontWeight: 700 },
  cell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#999",
    padding: 3,
    flex: 1,
  },
  cellSm: { flex: 0.6 },
  cellLg: { flex: 1.4 },
  cellMethod: { flex: 2.2 },
  cellAmount: { flex: 1 },
  cellDate: { flex: 1 },
  methodCellInner: { flexDirection: "row", alignItems: "flex-start" },
  checkboxMark: { width: 14, flexShrink: 0 },
  methodText: { flex: 1 },
  cellRight: { textAlign: "right" },
  cellCenter: { textAlign: "center" },
  listItem: { marginBottom: 2, paddingLeft: 8 },
  signatureRow: { flexDirection: "row", gap: 16, marginTop: 12 },
  signatureCol: { flex: 1 },
  headerRow: { flexDirection: "row", marginBottom: 10 },
  headerLeft: { width: "48%" },
  headerRight: { width: "52%", alignItems: "center" },
  companyName: { fontSize: 10, fontWeight: 700, textTransform: "uppercase" },
  logoRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  logo: { width: 42, height: 42, marginRight: 8, objectFit: "contain" },
  docNumber: { fontSize: 9 },
  nationalTitle: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
    textAlign: "center",
  },
  nationalMotto: {
    fontSize: 9,
    fontWeight: 700,
    textAlign: "center",
    textDecoration: "underline",
    marginTop: 2,
  },
  documentDate: {
    fontSize: 9,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 6,
  },
  subtitle: { fontSize: 8, fontWeight: 700, textTransform: "uppercase" },
});

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <Text style={styles.row}>
      <Text style={styles.bold}>{label} </Text>
      {value}
    </Text>
  );
}

export function RegistrationFormPdfDocument({
  data,
}: {
  data: RegistrationFormData;
}) {
  const docDate = data.documentDateParts;
  const checkIn = data.checkInParts;
  const checkOut = data.checkOutParts;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>
              {formatRegistrationCompanyLine(data.companyName, data.taxId)}
            </Text>
            <View style={styles.logoRow}>
              <Image src={REGISTRATION_LOGO_PATH} style={styles.logo} />
              <Text style={styles.docNumber}>Số: {data.documentNumber}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.nationalTitle}>
              Cộng hòa xã hội chủ nghĩa Việt Nam
            </Text>
            <Text style={styles.nationalMotto}>Độc lập – Tự do – Hạnh phúc</Text>
            <Text style={styles.documentDate}>
              Ngày {docDate.day} tháng {docDate.month} năm {docDate.year}
            </Text>
          </View>
        </View>

        <Text style={[styles.center, styles.title, { marginTop: 8 }]}>
          GIẤY ĐĂNG KÝ KHÁCH – ĐẶT PHÒNG & XÁC NHẬN THANH TOÁN
        </Text>
        <Text style={[styles.center, styles.subtitle, { marginTop: 4 }]}>
          GUEST REGISTRATION – ROOM RESERVATION & PAYMENT
        </Text>
        <Text style={[styles.center, styles.subtitle]}>CONFIRMATION FORM</Text>

        <FieldRow label="Khách sạn / Hotel:" value={data.hotelName} />
        <FieldRow label="Địa chỉ / Address:" value={data.hotelAddress} />
        <FieldRow label="Điện thoại / Tel:" value={data.hotelPhone} />
        <FieldRow label="Email:" value={data.hotelEmail} />

        <Text style={styles.sectionTitle}>
          1. Thông tin khách hàng / Guest Information
        </Text>
        <FieldRow label="Họ và tên / Full Name:" value={data.guestFullName} />
        <FieldRow label="Quốc tịch / Nationality:" value={data.guestNationality} />
        <FieldRow label="Số hộ chiếu / Passport No.:" value={data.guestIdCard} />
        <FieldRow label="Ngày sinh / Date of Birth:" value={data.guestDateOfBirth} />
        <FieldRow label="Điện thoại / Phone:" value={data.guestPhone} />
        <FieldRow label="Email:" value={data.guestEmail} />
        <FieldRow label="Địa chỉ / Address:" value={data.guestAddress} />
        <FieldRow
          label="Người đi cùng / Accompanying Guests:"
          value={data.accompanyingGuests}
        />

        <Text style={styles.sectionTitle}>
          2. Thông tin đặt phòng / Room Reservation Details
        </Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.cell, styles.cellLg]}>Hạng phòng / Room Type</Text>
            <Text style={[styles.cell, styles.cellSm, styles.cellCenter]}>SL</Text>
            <Text style={[styles.cell, styles.cellRight]}>Giá/đêm</Text>
            <Text style={[styles.cell, styles.cellSm, styles.cellCenter]}>Đêm</Text>
            <Text style={[styles.cell, styles.cellRight]}>Thành tiền</Text>
          </View>
          {data.roomRows.length > 0 ? (
            data.roomRows.map((row) => (
              <View key={row.roomType} style={styles.tableRow}>
                <Text style={[styles.cell, styles.cellLg]}>{row.roomType}</Text>
                <Text style={[styles.cell, styles.cellSm, styles.cellCenter]}>
                  {row.quantity}
                </Text>
                <Text style={[styles.cell, styles.cellRight]}>
                  {formatAmountPlain(row.ratePerNight)}
                </Text>
                <Text style={[styles.cell, styles.cellSm, styles.cellCenter]}>
                  {row.nights}
                </Text>
                <Text style={[styles.cell, styles.cellRight]}>
                  {formatAmountPlain(row.amount)}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.tableRow}>
              <Text style={[styles.cell, styles.cellCenter]}>{REGISTRATION_BLANK}</Text>
            </View>
          )}
        </View>

        <Text style={styles.row}>
          Ngày nhận phòng / Check-in: {checkIn.day}/{checkIn.month}/{checkIn.year}{" "}
          (sau 14:00)
        </Text>
        <Text style={styles.row}>
          Ngày trả phòng / Check-out: {checkOut.day}/{checkOut.month}/{checkOut.year}{" "}
          (trước 12:00)
        </Text>
        <Text style={styles.row}>
          Tổng số khách: Người lớn {data.totalAdults} / Trẻ em {data.totalChildren}
        </Text>
        <FieldRow
          label="Yêu cầu đặc biệt / Special Requests:"
          value={data.specialRequests}
        />

        <Text style={styles.sectionTitle}>
          3. Thông tin thanh toán / Payment Details
        </Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.cell, styles.cellMethod]}>
              Hình thức thanh toán / Payment Method
            </Text>
            <Text style={[styles.cell, styles.cellAmount]}>
              Số tiền / Amount (VND)
            </Text>
            <Text style={[styles.cell, styles.cellDate]}>
              Ngày thanh toán / Date
            </Text>
          </View>
          {data.paymentOptionRows.map((row) => (
            <View key={row.id} style={styles.tableRow}>
              <View style={[styles.cell, styles.cellMethod, styles.methodCellInner]}>
                <Text style={styles.checkboxMark}>
                  {formatPaymentCheckboxMark(row.checked)}
                </Text>
                <Text style={styles.methodText}>
                  {row.label}
                  {row.otherSuffix}
                </Text>
              </View>
              <View style={[styles.cell, styles.cellAmount]}>
                <Text style={styles.cellRight}>{row.amountDisplay || " "}</Text>
              </View>
              <View style={[styles.cell, styles.cellDate]}>
                <Text>{row.dateDisplay || " "}</Text>
              </View>
            </View>
          ))}
        </View>

        <FieldRow
          label="Tổng giá trị / Total Amount:"
          value={`${formatAmountPlain(data.totalAmount)} VND`}
        />
        <FieldRow
          label="Đã thanh toán / Paid:"
          value={`${formatAmountPlain(data.paidAmount)} VND`}
        />
        <FieldRow
          label="Còn lại / Balance:"
          value={`${formatAmountPlain(data.balanceAmount)} VND`}
        />

        <Text style={[styles.bold, { marginTop: 6 }]}>
          Thông tin tài khoản ngân hàng / Bank Account Information:
        </Text>
        <FieldRow label="Tên TK / Account Name:" value={data.bankAccountName} />
        <FieldRow label="Số TK / Account Number:" value={data.bankAccountNumber} />
        <FieldRow label="Ngân hàng / Bank Name:" value={data.bankName} />

        <Text style={styles.sectionTitle}>
          4. Chính sách & điều khoản / Terms & Conditions
        </Text>
        {data.terms.map((term) => (
          <Text key={term} style={styles.listItem}>
            • {term}
          </Text>
        ))}

        <Text style={styles.sectionTitle}>5. Cam kết / Agreement</Text>
        {data.agreementItems.map((item) => (
          <Text key={item} style={styles.listItem}>
            • {item}
          </Text>
        ))}
        <Text style={styles.row}>{data.policyNote}</Text>

        <Text style={styles.sectionTitle}>6. Xác nhận / Confirmation</Text>
        <View style={styles.signatureRow}>
          <View style={styles.signatureCol}>
            <FieldRow
              label="Khách hàng / Guest Signature:"
              value="................................"
            />
            <Text style={styles.row}>Ngày / Date: … / … / …</Text>
          </View>
          <View style={styles.signatureCol}>
            <FieldRow
              label="Đại diện KS / Hotel Representative:"
              value="................................"
            />
            <FieldRow label="Chức vụ / Position:" value="................................" />
            <Text style={styles.row}>Ngày / Date: … / … / …</Text>
            <Text style={[styles.center, { fontSize: 8, marginTop: 4 }]}>
              (Dấu khách sạn / Hotel Seal)
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

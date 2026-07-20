import type { Locale } from './config';

/**
 * Compile-time translation dictionary. `en` is the source of truth; any
 * key that is missing from another locale falls back to `en`.
 *
 * Clinical translations require review before production use, see
 * `docs/SECURITY.md`.
 */
export const DICTIONARIES = {
  en: {
    'nav.section.operations': 'Practice Operations',
    'nav.section.workspace': 'Workspace',
    'nav.section.clinical': 'Clinical',
    'nav.section.engagement': 'Patient Engagement',
    'nav.section.business': 'Business',
    'nav.section.admin': 'Admin',
    'nav.section.configuration': 'Configuration',
    'nav.section.reputation': 'Reputation',

    'nav.dashboard': 'Dashboard',
    'nav.appointments': 'Schedule',
    'nav.appointmentRequests': 'Online requests',
    'nav.patients': 'Patients',
    'nav.encounters': 'Encounters',
    'nav.prechart': 'Pre-Charting',
    'nav.aiScribe': 'AI Scribe',
    'nav.ambientScribe': 'Ambient Scribe',
    'nav.aiAssistant': 'AI Assistant',
    'nav.ai': 'AI',
    'nav.tasks': 'Tasks',
    'nav.billing': 'Billing',
    'nav.auditLogs': 'Audit Logs',
    'nav.support': 'Support',
    'nav.subscription': 'Plan & usage',
    'nav.practiceOnboarding': 'Practice onboarding',
    'nav.reports': 'Reports',
    'nav.reputation': 'Reputation',
    'nav.googleReviews': 'Google Reviews',
    'nav.googleQuestions': 'Google Questions',
    'nav.replyDrafts': 'Reply Drafts',
    'nav.reviewAnalytics': 'Review Analytics',

    'nav.timelineIntelligence': 'Timeline Intelligence',
    'nav.imaging': 'Imaging',
    'nav.imagingTimeline': 'Imaging Timeline',
    'nav.diseaseTemplates': 'Disease Templates',
    'nav.careGaps': 'Care Gap Autopilot',
    'nav.copilots': 'AI Copilots',

    'nav.portal': 'Patient Portal',
    'nav.scheduling': 'Online Booking',
    'nav.messages': 'Messages',
    'nav.education': 'Eye Health Library',
    'nav.reminders': 'Reminders',

    'nav.inventory': 'Inventory',
    'nav.financial': 'Reports',
    'nav.adminInsights': 'Admin Insights',

    'nav.setup': 'Practice Settings',
    'nav.team': 'Team',
    'nav.workflowBuilder': 'Workflow Builder',
    'nav.ehrIntegrations': 'EHR Integrations',
    'nav.installation': 'Installation readiness',
    'nav.settings': 'Settings',
    'nav.schedule': 'Schedule',
    'nav.practiceOverview': 'Practice Overview',
    'nav.schedulingOverview': 'Scheduling Overview',
    'nav.aiControl': 'AI Control Center',
    'nav.security': 'Security',
    'nav.templates': 'Templates',
    'nav.notifications': 'Notifications',
    'nav.aiReview': 'AI Review Center',
    'nav.clinicalResources': 'Clinical Resources',
    'nav.followUp': 'Follow-Up',
    'nav.patientQueue': 'Patient Queue',
    'nav.pretesting': 'Pretesting',
    'nav.imagingUpload': 'Imaging Upload',
    'nav.equipmentGuides': 'Equipment Guides',
    'nav.checkIn': 'Check-In',
    'nav.formsReminders': 'Forms & Reminders',
    'nav.payments': 'Payments',
    'nav.claims': 'Claims',
    'nav.patientBalances': 'Patient Balances',
    'nav.locations': 'Locations',
    'nav.patientFlow': 'Patient Flow',
    'nav.integrationCenter': 'Integration Center',
    'nav.remittances': 'Remittances',
    'nav.statements': 'Statements',
    'nav.migration': 'Data Migration',
    'nav.optical': 'Optical',

    'common.signOut': 'Sign out',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.delete': 'Delete',
    'common.loading': 'Loading…',
    'common.empty': 'Nothing here yet',
    'common.required': 'Required',
    'common.search': 'Search',
    'common.filter': 'Filter',

    'safety.aiReviewSupport':
      'EyeQ AI surfaces review-support signals only. It does not diagnose disease. Final clinical interpretation is the responsibility of the supervising provider.',
    'safety.documentationAssistance':
      'Documentation assistance only. The provider selects, confirms, and signs the final diagnosis and plan.',
    'safety.recordingConsent':
      'Recording should only occur with patient consent and according to practice policy and applicable law.',
    'safety.financialOwnerOnly':
      'Financial reports are owner / admin scope only.',
    'safety.translationsReview':
      'Clinical translations should be reviewed before production use.',
    'safety.smsConsent':
      'SMS / email reminders require patient consent and HIPAA-compliant vendors (Twilio with BAA, etc.).',
    'safety.ehrApproval':
      'EHR integrations require vendor approval and a security review before going live.',
  },

  es: {
    'nav.section.operations': 'Operaciones de la práctica',
    'nav.section.clinical': 'Inteligencia clínica',
    'nav.section.engagement': 'Participación del paciente',
    'nav.section.business': 'Negocio',
    'nav.section.configuration': 'Configuración',

    'nav.dashboard': 'Centro de la práctica',
    'nav.appointments': 'Citas',
    'nav.patients': 'Historia clínica',
    'nav.prechart': 'Pre-charting',
    'nav.aiScribe': 'Escribano IA',
    'nav.ambientScribe': 'Escribano ambiental',

    'nav.timelineIntelligence': 'Inteligencia de línea de tiempo',
    'nav.imaging': 'Revisión de imagen',
    'nav.imagingTimeline': 'Línea de tiempo de imagen',
    'nav.diseaseTemplates': 'Plantillas clínicas',
    'nav.careGaps': 'Autopiloto de seguimiento',
    'nav.copilots': 'Copilotos IA',

    'nav.portal': 'Portal del paciente',
    'nav.scheduling': 'Programación',
    'nav.messages': 'Mensajes',
    'nav.education': 'Centro educativo',
    'nav.reminders': 'Recordatorios',

    'nav.inventory': 'Inventario',
    'nav.financial': 'Informes financieros',
    'nav.adminInsights': 'Información de administración',

    'nav.setup': 'Configuración de la práctica',
    'nav.team': 'Equipo',
    'nav.workflowBuilder': 'Constructor de flujos',
    'nav.ehrIntegrations': 'Integraciones de EHR',
    'nav.settings': 'Ajustes',

    'common.signOut': 'Cerrar sesión',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.close': 'Cerrar',
    'common.delete': 'Eliminar',
    'common.loading': 'Cargando…',
    'common.empty': 'Aún no hay nada aquí',
    'common.required': 'Requerido',
    'common.search': 'Buscar',
    'common.filter': 'Filtrar',

    'safety.aiReviewSupport':
      'EyeQ AI ofrece señales de apoyo a la revisión, no diagnostica. La interpretación clínica final corresponde al proveedor supervisor.',
    'safety.documentationAssistance':
      'Asistencia para la documentación únicamente. El proveedor selecciona, confirma y firma el diagnóstico y plan finales.',
    'safety.recordingConsent':
      'La grabación solo debe realizarse con el consentimiento del paciente y conforme a la política de la práctica y la ley aplicable.',
    'safety.financialOwnerOnly':
      'Los informes financieros son de acceso exclusivo de propietarios / administradores.',
    'safety.translationsReview':
      'Las traducciones clínicas deben revisarse antes de su uso en producción.',
    'safety.smsConsent':
      'Los recordatorios por SMS / correo requieren consentimiento del paciente y proveedores con BAA HIPAA.',
    'safety.ehrApproval':
      'Las integraciones con EHR requieren aprobación del proveedor y revisión de seguridad antes de habilitarse.',
  },

  hi: {
    'nav.section.operations': 'प्रैक्टिस संचालन',
    'nav.section.clinical': 'क्लिनिकल इंटेलिजेंस',
    'nav.section.engagement': 'मरीज़ की भागीदारी',
    'nav.section.business': 'व्यवसाय',
    'nav.section.configuration': 'कॉन्फ़िगरेशन',
    'nav.dashboard': 'प्रैक्टिस ब्रेन',
    'nav.appointments': 'अपॉइंटमेंट',
    'nav.patients': 'मरीज़ चार्ट',
    'nav.imaging': 'इमेजिंग समीक्षा',
    'nav.diseaseTemplates': 'रोग टेम्पलेट',
    'nav.careGaps': 'केयर गैप',
    'nav.portal': 'मरीज़ पोर्टल',
    'nav.messages': 'संदेश',
    'nav.reminders': 'रिमाइंडर',
    'nav.inventory': 'इन्वेंट्री',
    'nav.financial': 'वित्तीय रिपोर्ट',
    'nav.ehrIntegrations': 'EHR एकीकरण',
    'nav.settings': 'सेटिंग्स',
    'common.signOut': 'साइन आउट',
    'common.save': 'सहेजें',
    'common.cancel': 'रद्द करें',
    'safety.aiReviewSupport':
      'EyeQ AI केवल समीक्षा-सहायक संकेत प्रदान करता है, यह रोग का निदान नहीं करता है।',
    'safety.translationsReview':
      'क्लिनिकल अनुवाद उत्पादन में उपयोग से पहले समीक्षित होने चाहिए।',
  },

  gu: {
    'nav.section.operations': 'પ્રેક્ટિસ ઑપરેશન્સ',
    'nav.section.clinical': 'ક્લિનિકલ ઈન્ટેલિજન્સ',
    'nav.section.engagement': 'દર્દી જોડાણ',
    'nav.section.business': 'વ્યવસાય',
    'nav.section.configuration': 'કોન્ફિગરેશન',
    'nav.dashboard': 'પ્રેક્ટિસ બ્રેઈન',
    'nav.appointments': 'એપોઈન્ટમેન્ટ',
    'nav.patients': 'દર્દી ચાર્ટ',
    'nav.imaging': 'ઈમેજિંગ રિવ્યૂ',
    'nav.diseaseTemplates': 'રોગ ટેમ્પ્લેટ્સ',
    'nav.careGaps': 'કેર ગૅપ',
    'nav.portal': 'દર્દી પોર્ટલ',
    'nav.messages': 'સંદેશા',
    'nav.reminders': 'રિમાઈન્ડર',
    'nav.inventory': 'ઈન્વેન્ટરી',
    'nav.financial': 'નાણાકીય અહેવાલો',
    'nav.ehrIntegrations': 'EHR ઈન્ટિગ્રેશન',
    'nav.settings': 'સેટિંગ્સ',
    'common.signOut': 'સાઇન આઉટ',
    'common.save': 'સાચવો',
    'common.cancel': 'રદ કરો',
    'safety.aiReviewSupport':
      'EyeQ AI માત્ર સમીક્ષા-સહાય સંકેતો જ આપે છે. તે રોગનું નિદાન કરતું નથી.',
    'safety.translationsReview':
      'ક્લિનિકલ અનુવાદો ઉત્પાદન ઉપયોગ પહેલાં સમીક્ષિત હોવા જોઈએ.',
  },

  ar: {
    'nav.section.operations': 'عمليات العيادة',
    'nav.section.clinical': 'الذكاء السريري',
    'nav.section.engagement': 'تواصل المريض',
    'nav.section.business': 'الأعمال',
    'nav.section.configuration': 'الإعدادات',
    'nav.dashboard': 'مركز العيادة',
    'nav.appointments': 'المواعيد',
    'nav.patients': 'ملف المريض',
    'nav.imaging': 'مراجعة التصوير',
    'nav.diseaseTemplates': 'قوالب الحالات',
    'nav.careGaps': 'متابعة الرعاية',
    'nav.portal': 'بوابة المريض',
    'nav.messages': 'الرسائل',
    'nav.reminders': 'التذكيرات',
    'nav.inventory': 'المخزون',
    'nav.financial': 'التقارير المالية',
    'nav.ehrIntegrations': 'تكاملات EHR',
    'nav.settings': 'الإعدادات',
    'common.signOut': 'تسجيل الخروج',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'safety.aiReviewSupport':
      'يقدم EyeQ AI إشارات داعمة للمراجعة فقط، ولا يقوم بتشخيص الأمراض.',
    'safety.translationsReview':
      'يجب مراجعة الترجمات السريرية قبل الاستخدام في الإنتاج.',
  },

  zh: {
    'nav.section.operations': '诊所运营',
    'nav.section.clinical': '临床智能',
    'nav.section.engagement': '患者互动',
    'nav.section.business': '业务',
    'nav.section.configuration': '配置',
    'nav.dashboard': '诊所中枢',
    'nav.appointments': '预约',
    'nav.patients': '患者档案',
    'nav.imaging': '影像审阅',
    'nav.diseaseTemplates': '疾病模板',
    'nav.careGaps': '关怀缺口',
    'nav.portal': '患者门户',
    'nav.messages': '消息',
    'nav.reminders': '提醒',
    'nav.inventory': '库存',
    'nav.financial': '财务报告',
    'nav.ehrIntegrations': 'EHR 集成',
    'nav.settings': '设置',
    'common.signOut': '退出登录',
    'common.save': '保存',
    'common.cancel': '取消',
    'safety.aiReviewSupport':
      'EyeQ AI 仅提供审阅辅助信号，不进行疾病诊断。',
    'safety.translationsReview':
      '临床翻译在生产使用前应进行审核。',
  },

  vi: {
    'nav.section.operations': 'Vận hành phòng khám',
    'nav.section.clinical': 'Trí tuệ lâm sàng',
    'nav.section.engagement': 'Tương tác bệnh nhân',
    'nav.section.business': 'Kinh doanh',
    'nav.section.configuration': 'Cấu hình',
    'nav.dashboard': 'Trung tâm phòng khám',
    'nav.appointments': 'Lịch hẹn',
    'nav.patients': 'Hồ sơ bệnh nhân',
    'nav.imaging': 'Xem hình ảnh',
    'nav.diseaseTemplates': 'Mẫu bệnh lý',
    'nav.careGaps': 'Khoảng trống chăm sóc',
    'nav.portal': 'Cổng bệnh nhân',
    'nav.messages': 'Tin nhắn',
    'nav.reminders': 'Nhắc nhở',
    'nav.inventory': 'Tồn kho',
    'nav.financial': 'Báo cáo tài chính',
    'nav.ehrIntegrations': 'Tích hợp EHR',
    'nav.settings': 'Cài đặt',
    'common.signOut': 'Đăng xuất',
    'common.save': 'Lưu',
    'common.cancel': 'Hủy',
    'safety.aiReviewSupport':
      'EyeQ AI chỉ cung cấp tín hiệu hỗ trợ xem xét, không chẩn đoán bệnh.',
    'safety.translationsReview':
      'Bản dịch lâm sàng cần được xem xét trước khi sử dụng trong sản xuất.',
  },
} as const satisfies Record<Locale, Record<string, string>>;

export type DictionaryKey = keyof (typeof DICTIONARIES)['en'];

export function translate(locale: Locale, key: DictionaryKey | string): string {
  const dict = DICTIONARIES[locale] as Record<string, string> | undefined;
  if (dict && key in dict) return dict[key];
  const fallback = DICTIONARIES.en as Record<string, string>;
  return fallback[key as string] ?? (key as string);
}

/** Phase 1 UI strings (Hebrew) */
export const he = {
  loading: 'טוען…',
  save: 'שמירה',
  saved: 'נשמר.',
  create: 'יצירה',
  delete: 'מחיקה',
  remove: 'הסרה',
  add: 'הוספה',
  name: 'שם',
  schoolId: 'מזהה בית ספר',
  email: 'אימייל',
  password: 'סיסמה',
  type: 'סוג',
  labels: 'תוויות',
  order: 'סדר',
  cancel: 'ביטול',

  appTitle: 'ניהול בית ספר',
  appDescription: 'הגדרת בית ספר רב-משתמשים',

  loginTitle: 'כניסה למערכת',
  loginSubtitle: 'מנהלת · מחנכת · מורה מקצוע — לפי המשתמש שנוצר ב«משתמשים».',
  switchUserHint: 'להחלפת משתמש: לחצי «יציאה» בתפריט הצד.',
  signIn: 'כניסה',
  signingIn: 'מתחבר…',
  loginFailed: 'ההתחברות נכשלה',
  networkError: 'לא ניתן להתחבר לשרת. ודאי שה-API רץ (פורט 3001).',
  invalidCredentials: 'אימייל או סיסמה שגויים',
  missingSchoolId: 'יש להזין מזהה בית ספר',
  forgotPassword: 'שכחתי סיסמה',
  forgotPasswordTitle: 'איפוס סיסמה',
  forgotPasswordSubtitle: 'הכניסי את מזהה בית הספר והאימייל שלך ונשלח קישור לאיפוס.',
  forgotPasswordSent: 'אם הפרטים נכונים, נשלח אלייך קישור לאיפוס הסיסמה.',
  sendResetLink: 'שלחי קישור',
  sendingResetLink: 'שולח…',
  resetPasswordTitle: 'הגדרת סיסמה חדשה',
  resetPasswordSubtitle: 'הכניסי סיסמה חדשה לחשבונך.',
  newPassword: 'סיסמה חדשה',
  confirmPassword: 'אימות סיסמה',
  passwordMismatch: 'הסיסמאות אינן תואמות',
  passwordTooShort: 'סיסמה חייבת להכיל לפחות 6 תווים',
  resetPasswordSuccess: 'הסיסמה שונתה בהצלחה. כעת ניתן להתחבר.',
  resetPasswordInvalidToken: 'הקישור אינו תקף או שפג תוקפו. בקשי קישור חדש.',
  backToLogin: 'חזרה לכניסה',

  schoolAdmin: 'ניהול בית ספר',
  superAdminPortal: 'ניהול פלטפורמה',
  navSuperAdminSchools: 'בתי ספר',
  superAdminCreateSchool: 'יצירת בית ספר',
  superAdminSchoolName: 'שם בית הספר',
  superAdminAdminName: 'שם המנהלת',
  superAdminAdminEmail: 'אימייל מנהלת',
  superAdminAdminPassword: 'סיסמה זמנית',
  superAdminLoginToggle: 'כניסת Super-Admin',
  superAdminStudents: 'תלמידים',
  superAdminCertificates: 'תעודות',
  superAdminStatusActive: 'פעיל',
  superAdminStatusBlocked: 'חסום',
  blockSchool: 'חסימת בית ספר',
  unblockSchool: 'ביטול חסימה',
  deleteSchool: 'מחיקת בית ספר',
  deleteSchoolConfirm: 'האם למחוק את בית הספר? ניתן לשחזר בעתיד.',
  restoreSchool: 'שחזור בית ספר',
  showDeleted: 'הצג מחוקים',
  hideDeleted: 'הסתר מחוקים',
  superAdminStatusDeleted: 'מחוק',
  schoolBlockedLogin: 'בית הספר חסום זמנית. פני לתמיכה.',
  schoolDeletedLogin: 'בית הספר אינו פעיל במערכת. פני לתמיכה.',
  logout: 'יציאה',
  navDashboard: 'לוח בקרה',
  navSchool: 'הגדרות בית ספר',
  navCertificateProfile: 'פרופיל תעודה',
  navGradingSets: 'הגדרת ציונים',
  navSubjects: 'מקצועות',
  navClasses: 'כיתות',
  navStudents: 'תלמידים (צפייה)',
  navMyStudents: 'התלמידות שלי',
  navUsers: 'משתמשים',
  navGradebook: 'מחוון ציונים',
  navAdminGradebook: 'תקופות ציון',
  navCertificates: 'תעודות',
  navCertificateTemplates: 'עיצוב תעודות',
  navTeacherCertificates: 'תעודות',
  gradebookWhatIs:
    'מילוי ציונים: מחנכת (כל המקצועות בכיתה) או מורה מקצועית (רק המקצוע שלה) — בפורטל המורה. כאן (מנהלת): תקופות ציון וצפייה בלבד.',
  adminGradebookSteps:
    '1) צרי תקופת ציון (סמסטר א׳ / מחצית א׳). 2) אפשר לבחור כיתה + תקופה לצפייה — בלי עריכה. 3) מחנכת ומורות מקצועיות ממלאות ב«פורטל מורה» → מחוון.',
  teacherGradebookHint:
    'מורה מקצועית: עמודה אחת בכל פעם — המקצוע שלך (למשל דקדוק לכל הכיתה, או חשבון-א1 לקבוצה). מחנכת: כל העמודות.',
  selectSubjectForGradebook: 'בחירת מקצוע למילוי',
  pickSubjectForGradebook: 'יש לך כמה שיוכים לכיתה — בחרי מקצוע מהרשימה.',
  gradebookFocusSubject: 'ממלאים ציונים עבור',
  homeroomGradebookHint:
    'כמחנכת — אפשר לעדכן ציונים בכל המקצועות של הכיתה שלך.',
  gradebookViewOnlyHint:
    'צפייה בלבד — להזנת ציונים ונתוני תעודה המורות/מחנכות נכנסות דרך «פורטל מורה».',
  homeroomPortal: 'פורטל מחנכת',
  teacherPortal: 'פורטל מורה',
  teacherClassesTitle: 'הכיתות שלי',
  openGradebook: 'מחוון',
  backToClasses: 'חזרה לכיתות',
  selectClassAndTermFirst: 'בחרי כיתה ותקופה כדי להציג תעודות.',
  teacherTabGradebook: 'מחוון ציונים',
  teacherTabCertificates: 'תעודות',
  selectClass: 'בחירת כיתה',
  selectTerm: 'בחירת תקופת ציון',
  selectPlaceholder: '— בחרי —',
  studentName: 'שם תלמיד/ה',
  gradebookSaving: 'שומר…',
  gradebookSaved: 'נשמר.',
  gradebookPending: 'שינויים ממתינים לשמירה…',
  gradebookSaveError: 'שגיאת שמירה',
  gradebookShortcutsHint:
    'Ctrl+Z / Ctrl+Y · Ctrl+C/V · Tab/Enter · גרירה מהפינה הכחולה (כל הכיוונים, בתוך הקטגוריה)',
  gradebookUndo: 'ביטול',
  gradebookRedo: 'שחזור',
  gradebookFillHandleTitle: 'גרירה להעתקת הציון (בתוך הקטגוריה בלבד)',
  gradebookDefaultCategory: 'כללי',
  termLockedHint: 'תקופת ציון נעולה',
  termLockedBanner: 'תקופת ציון נעולה — לא ניתן לערוך ציונים',
  lockedLabel: 'נעול',
  lockAvailable: 'פנוי',
  lockYouEditing: 'נערך על ידך',
  lockHeldBy: (name: string) => `נעול על ידי ${name}`,
  lockAcquireFailed: 'לא ניתן לערוך — העמודה נעולה על ידי מורה אחר',
  lockExpiredOnSave: 'פג תוקף הנעילה — נסי שוב לערוך את התא',
  adminOnly: 'דף זה למנהלת בלבד.',
  teacherOnly: 'דף זה למורות בלבד.',
  noTermsHint: 'אין תקופות ציון — המנהלת יוצרת ב-API או בממשק.',
  noClassesForTeacher: 'אין כיתות משויכות למשתמש זה.',
  noClassesHomeroomHint:
    'לא שויכת כמחנכת לאף כיתה. המנהלת: ב«כיתות» → עריכת הכיתה → בחרי את שמך בשדה «מחנך/ת הכיתה».',
  noClassesSubjectTeacherHint:
    'אין שיוך מורה מקצועית לכיתות. המנהלת: ב«משתמשים» → שיוך מורה → בחרי כיתה ומקצועים.',
  selectHomeroomRequired: 'בחרי מחנכת (חובה)',
  homeroomRequiredHint:
    'בלי מחנכת משויכת — המחנכת לא תראה את הכיתה במחוון ובתלמידות.',
  classesAdminCreateOnly:
    'יצירת כיתה — רק מנהלת. התחברי כמנהלת (משתמש admin) ב«כיתות».',
  noHomeroomUsersHint:
    'אין משתמש «מחנכת» במערכת. ב«משתמשים» צרי מחנכת, או בחרי את המנהלת כמחנכת זמנית.',
  classCreatedOk: 'הכיתה נוצרה והופיעה בטבלה.',
  noClassesInSchool:
    'אין כיתות במערכת. מלאי את הטופס למעלה (כמנהלת) ולחצי «הוספת כיתה».',
  classesListError: 'לא נטענו כיתות מהשרת — בדקי ש-pnpm dev רץ ושהתחברת כמנהלת.',
  assignmentNeedClass:
    'אין כיתות לבחירה. קודם צרי כיתה ב«כיתות» (כמנהלת), ואז חזרי לשיוך מורה.',
  gradebookTermsTitle: 'תקופות ציון (סמסטר / מחצית)',
  gradebookTermsHint:
    'תקופת ציון = מתי ניתנו הציונים. נעל/י תקופה לפני הפקת תעודות — לאחר נעילה עריכת ציונים חסומה.',
  gradebookTermsAdd: 'הוספת תקופה',
  gradebookTermsNamePlaceholder: 'שם תקופה (למשל סמסטר א׳)',
  gradebookTermsDelete: 'מחיקת תקופה',
  gradebookTermsDeleteConfirm:
    'למחוק את התקופה? אפשר רק אם אין בה ציונים, נתוני תעודה או תעודות שהופקו.',
  gradingTypeParent: 'תחת קטגוריה (אופציונלי)',
  gradingTypeParentNone: 'קטגוריה ראשית',
  gradingTypeSubCategory: 'תת-קטגוריה',
  certProfilesTitle: 'פרופילי תעודה (לפי שכבות)',
  certProfilesHint:
    'ניתן להגדיר מספר מבני תעודה — למשל «א–ד» ו«ה–ח». ב«כיתות» משייכים כל כיתה לפרופיל.',
  certProfileName: 'שם פרופיל',
  certProfileAdd: 'הוספת פרופיל',
  certProfileDelete: 'מחיקת פרופיל',
  certProfileDefault: 'ברירת מחדל לכיתות ללא שיוך',
  certProfileSelectEdit: 'עריכת פרופיל',
  certProfileSubjectsTitle: 'מקצועות בתעודה',
  certProfileSubjectsHint:
    'בחרי אילו מקצועות יופיעו בתעודה ובמחוון ציונים לכיתות עם פרופיל זה. ללא בחירה — כל מקצועות בית הספר.',
  certProfileSubjectsSelectAll: 'בחר הכל',
  certProfileSubjectsClearAll: 'נקה הכל',
  certProfileSubjectsCopyFrom: 'העתק מקצועות מפרופיל',
  certProfileSubjectsCopyApply: 'העתק',
  certProfileSubjectsCount: (selected: number, total: number) =>
    `${selected} מתוך ${total} מקצועות נבחרו`,
  certProfileSubjectsEmptyWarning: 'לא נבחר אף מקצוע — התעודה תהיה ללא ציונים.',
  classCertProfile: 'פרופיל תעודה',
  classCertProfileDefault: 'ברירת מחדל',
  gradebookActiveCertProfile: (name: string) => `פרופיל תעודה פעיל: ${name}`,
  gradebookNoComputerCertCols:
    'אין עמודות מילוי במחשב בפרופיל זה. ב«בית ספר» הגדירי מילוי במחשב לפרופיל, או שייכי ב«כיתות» פרופיל עם מילוי במחשב.',
  termLockConfirm: 'לנעול את התקופה? לא ניתן יהיה לערוך ציונים, וניתן יהיה להפיק תעודות.',
  termUnlockConfirm:
    'לפתוח את התקופה לעריכה? תעודות שכבר הופקו יישארו במערכת.',
  termLockAction: 'נעילת תקופה',
  termUnlockAction: 'פתיחת תקופה',
  certificatesTitle: 'הפקת תעודות',
  certificatesHint: 'בחרי כיתה ותקופה. הפקה אפשרית רק לאחר נעילת התקופה.',
  certificatesStructureLink: 'הגדרת מבנה תעודה — ב«בית ספר»',
  certificatesLockTermHint: 'לפני הפקה: נעל/י את התקופה ב«תקופות ציון» (מנהלת).',
  certificatesGenerateErrors: 'שגיאות בהפקה:',
  certificatesGenerate: 'הפקת תעודות לכיתה',
  certificatesGenerating: 'מפיקה…',
  certificatesPreview: 'תצוגה',
  certificatesDownload: 'הורדה',
  closePreview: 'סגירה',
  certificatesNoSnapshots: 'אין תעודות שהופקו',
  certificatesGenerateDisabled: 'נעל/י את התקופה לפני הפקה',
  certificatesAdminReadOnly:
    'צפייה בתעודות בלבד — הזנת נתונים והפקה הן תפקיד המחנכת דרך «פורטל מורה».',
  certificatesLatest: 'הפקה אחרונה',
  certificatesGenerateOne: 'הפקת תעודה',
  certificatesNoStudents: 'אין תלמידות בכיתה',
  certificatesCohortLink: 'הגדרת מחזור — ב«כיתות»',
  certificatesCohortValue: (cohort: string) => `מחזור בכיתה: ${cohort}`,
  certClassNoProfile: 'לכיתה הנבחרת אין פרופיל תעודה — ייעשה שימוש בפרופיל ברירת מחדל.',
  certClassNoProfileLink: 'שייך פרופיל בעמוד הכיתות',
  certTermNotLockedEarly: 'התקופה הנבחרת עדיין לא נעולה — לא ניתן יהיה להפיק תעודות עד לנעילתה.',
  certSetupBannerTitle: 'הגדרת תעודות — 3 שלבים להפקה ראשונה',
  certSetupStep1: 'הגדר פרופיל תעודה',
  certSetupStep1Hint: 'מה יופיע בתעודה — מקצועות, נוכחות, חתימות',
  certSetupStep1Link: 'הגדרות בית ספר',
  certSetupStep2: 'צור עיצוב תעודה',
  certSetupStep2Hint: 'פריסה ויזואלית — לפי הפרופיל שהגדרת',
  certSetupStep2Link: 'עיצוב תעודות',
  certSetupStep3: 'שייך פרופיל לכיתות',
  certSetupStep3Hint: 'כל כיתה יודעת לפי איזה פרופיל מפיקים',
  certSetupStep3Link: 'כיתות',
  certProfileWhatIsIt: 'פרופיל תעודה מגדיר מה יופיע בתעודה: אילו מקצועות, האם תופיע נוכחות, אילו חתימות ועוד. לכל פרופיל מקושר עיצוב ויזואלי.',
  certProfileNoTemplate: 'לפרופיל זה לא מקושר עיצוב — ייעשה שימוש בעיצוב ברירת מחדל של המערכת.',
  certTemplateLinkedProfile: 'פרופיל מקושר',
  certTemplateNoProfileLinked: 'לא מקושר',
  certTemplateSelectProfile: 'לאיזה פרופיל תעודה?',
  certTemplateAutoLinked: (name: string) => `העיצוב שויך לפרופיל "${name}"`,
  certClassMissingProfile: 'לא הוגדר פרופיל',
  certClassMissingProfileHint: 'לכיתה זו אין פרופיל תעודה — תופק בפרופיל ברירת מחדל',
  certTemplatesTitle: 'עיצוב תבניות תעודה',
  certTemplatesHint: 'צרי תבנית ויזואלית לכל בית ספר וקשרי אותה למבנה תעודה ב«בית ספר».',
  certTemplatesCreate: 'תבנית חדשה',
  certTemplatesEdit: 'עריכה',
  certTemplatesOrientation: 'כיוון דף',
  certTemplatesPortrait: 'לאורך',
  certTemplatesLandscape: 'לרוחב',
  certTemplatesLayoutVersion: (v: number) => `גרסת עיצוב: ${v}`,
  certTemplatesDeleteBlocked: 'לא ניתן למחוק — התבנית מקושרת למבני תעודה:',
  certTemplatesPreview: 'תצוגה מקדימה',
  certTemplatesSaveLayout: 'שמירת עיצוב',
  certTemplatesUndo: 'ביטול (Ctrl+Z)',
  certTemplatesRedo: 'ביצוע מחדש (Ctrl+Y)',
  certTemplatesBlockPalette: 'הוספת בלוק',
  certTemplatesProfileTemplate: 'תבנית עיצוב',
  certTemplatesSystemDefault: 'ברירת מחדל מערכת',
  certTemplatesLinked: (name: string) => `תבנית: ${name}`,
  cohortLabel: 'מחזור',
  certSupplementTitle: 'נתונים לתעודה (מילוי במחשב)',
  certSupplementHint:
    'מלאי כאן שדות שהוגדרו «במחשב» במבנה התעודה — הערות לציונים, הערכה, נוכחות וחתימות. שמרי לפני הפקה.',
  certUnifiedTableTitle: 'ציונים ונתוני תעודה',
  certUnifiedTableHint:
    'טבלה אחת: ציון ו«הערה» ליד כל מקצוע (כשמוגדר במחשב), ואחריהם שדות התעודה. ציונים — מהמחוון; שדות תעודה — שמרי בנפרד.',
  certSupplementSave: 'שמירת נתוני תעודה',
  certSupplementSaveHint:
    'שדות התעודה (הערות, הערכה, נוכחות, חתימות) — שמרי לפני הפקה. גרירת מילוי (במחוון) חלה רק על ציונים, לא על הערות.',
  certificatesActions: 'פעולות',
  certCohortMissingHint:
    'מחזור לא הוגדר לכיתה. הוסיפי «מחזור» בעמוד «כיתות» כדי שיופיע בתעודה.',
  certGradeCommentCol: (subject: string) => `הערה · ${subject}`,
  certHomeroomSignature: 'חתימת מחנך/ת',
  certPrincipalSignature: 'חתימת מנהל/ת',
  saving: 'שומר…',
  gradebookAmbiguousHint:
    'יש כפילות בהגדרת ציונים (למשל שתי רשימות ל«לימודי»). עברי ל«הגדרת ציונים» → מחקי שורות «רשימה כפולה» — השאירי קטגוריה אחת עם כל הציונים.',

  dashboardTitle: 'לוח בקרה',
  dashboardWelcome: (name: string) => `שלום, ${name}.`,
  dashboardHint:
    'סדר עבודה: הגדרת ציונים → מקצועות → כיתות ושיוך מורים → מחנכת מוסיפה תלמידות → תקופות ציון. מילוי ציונים — מחנכת (כל הכיתה) או מורה מקצועית (מקצועה) בפורטל המורה.',
  homeroomDashboardHint:
    'כאן מוסיפים תלמידות לכיתה (ללא קבוצות). שיוך לקבוצות לימוד לפי מקצוע — בחלק «קבוצות לימוד» למטה.',
  studentGroupsTitle: 'קבוצות לימוד (לפי מקצוע)',
  studentGroupsHint:
    'לכל מקצוע שיש לו קבוצות בכיתה — בחרי קבוצה לכל תלמידה. מקצוע בלי קבוצות (למשל דקדוק) — אין צורך לשייך.',
  studentGroupsNone:
    'אין קבוצות מוגדרות לכיתה זו. המנהלת מגדירה קבוצות ב«כיתות» → ניהול קבוצות (לפי מקצוע).',

  schoolSettings: 'הגדרות בית ספר',
  schoolName: 'שם בית הספר',
  schoolLogoTitle: 'לוגו בית הספר',
  schoolLogoHint: 'הלוגו יופיע בתעודות שאין להן לוגו ספציפי בתבנית',
  schoolLogoUpload: 'העלאת לוגו',
  schoolLogoChange: 'החלפת לוגו',

  gradingSetsTitle: 'הגדרת ציונים',
  gradingTypesTitle: 'קטגוריות (לימודי, התנהגות…)',
  gradingTypesHint:
    'קטגוריה (לימודי, התנהגות, מיומנויות…). לכל קטגוריה מוסיפים את כל הציונים: מצוין, טוב מאוד, טוב… — בלי «שם סט».',
  gradingTypesEmpty: 'עדיין אין סוגים. הוסיפי את הסוג הראשון למטה.',
  addGradingType: 'הוספת סוג',
  gradingTypeName: 'שם הסוג (למשל: מיומנויות)',
  gradingTypeKeyOptional: 'מזהה באנגלית (אופציונלי)',
  selectGradingType: 'בחירת סוג ציון',
  createSet: 'הוספת סט',
  createSetHint:
    'הוסיפי ציון חדש לרשימה (מצוין, טוב מאוד, טוב…). אפשר כמה ציונים — אין מגבלה.',
  gradingSetsClarify:
    'לכל קטגוריה רשימת ציונים אחת. המורה תבחר מהרשימה במחוון. אין צורך להגדיר «שם סט» — רק קטגוריה וציונים.',
  gradesInCategory: 'ציונים',
  addGradeLabel: 'הוספת ציון',
  noGradesInCategory: 'עדיין אין ציונים בקטגוריה — הוסיפי למטה.',
  duplicateGradingSetsWarning:
    'יש יותר מרשימה אחת לקטגוריה זו (שגיאה ישנה). מחקי שורות כפולות — נשארת רשימה אחת.',
  categoryEmptyGradesWarning: (subjectCount: number) =>
    `${subjectCount} מקצועות מקושרים לקטגוריה הזו בלי ציונים — הוסיפי ציונים כאן, או ב«מקצועות» שני לקטגוריה שיש בה ציונים.`,
  categorySubjectsLinked: (n: number) =>
    n === 0 ? 'אין מקצועות מקושרים' : `${n} מקצועות מקושרים`,
  setsList: 'רשימת סטים',
  setsGroupedHint: 'סטי התוויות מוצגים לפי קטגוריה — לא ברשימה אחת.',
  setsByCategoryTitle: 'קטגוריות וציונים',
  noSetsInCategory: 'אין סטים בקטגוריה זו.',
  setCount: (n: number) => (n === 1 ? 'סט אחד' : `${n} סטים`),
  addSetInCategory: 'שם סט חדש בקטגוריה זו',
  deleteCategory: 'מחיקת קטגוריה',
  labelsFor: (name: string) => `תוויות עבור ${name}`,
  addLabel: 'הוספת ציון',
  labelPlaceholder: 'שם הציון (מצוין, טוב מאוד…)',
  gradeNamePlaceholder: 'שם הציון (מצוין, טוב מאוד…)',
  namePlaceholder: 'שם',
  setName: 'שם הסט',

  subjectsTitle: 'מקצועות',
  subjectsHint:
    'רק שם מקצוע + קטגוריה (לימודי / התנהגות וכו׳). אילו תוויות יופיעו במחוון — מוגדרות ב«סטי ציון». המורה תבחר ציון בזמן מילוי (שלב 2).',
  subjectsGroupedHint: 'המקצועות מוצגים לפי קטגוריה — לא ברשימה אחת.',
  noSubjectsInCategory: 'אין מקצועות בקטגוריה זו.',
  subjectName: 'שם מקצוע',
  selectSubjectCategory: 'קטגוריה (סוג ציון)',
  selectGradingTypeFirst: 'קודם בחרי סוג ציון',
  selectGradingSet: 'בחירת סט ציון (לפי הסוג)',
  addSubject: 'הוספת מקצוע',
  gradingSetCol: 'סט ציון',
  subjectTypeCol: 'קטגוריה',
  labelsPanelHint:
    'כאן מגדירים את רשימת התוויות שהמורה תוכל לבחור במחוון (למשל: מצוין, טוב, מספיק). לוחצים על שם הסט בטבלה למעלה, ואז מוסיפים תוויות. זה לא קשור למקצוע ספציפי — מקצוע רק מקושר לקטגוריה.',

  classesOnlyTitle: 'כיתות',
  classesOnlyHint:
    'יצירת כיתות, שיוך מחנך/ת, והגדרת קבוצות לפי רמה (לשיעורים מפוצלים). תלמידים — אצל המחנכת.',
  classGroupsTitle: 'קבוצות בכיתה',
  classGroupsHint:
    'קבוצה שייכת למקצוע (חשבון א1, אנגלית מתקדמים…). מקצוע בלי קבוצות (דקדוג) — לא יוצרים קבוצה. בשיוך מורה יוצגו רק קבוצות של אותו מקצוע.',
  groupSubjectLabel: 'מקצוע לקבוצה',
  groupNamePlaceholder: 'שם קבוצה (למשל: חשבון א1)',
  addGroup: 'הוספת קבוצה',
  groupsCol: 'קבוצות',
  manageGroups: 'ניהול קבוצות',
  groupCol: 'קבוצה',
  noGroup: 'ללא קבוצה',
  classesTitle: 'כיתות',
  studentsTitle: 'תלמידים',
  studentsHint: 'הוספת תלמידים לכיתה. קודם צריך ליצור כיתה ב«כיתות».',
  studentsGroupedHint: 'התלמידים מוצגים לפי כיתה — לא ברשימה אחת.',
  studentsAdminViewHint:
    'צפייה בלבד למנהלת. הוספה/עריכה/מחיקה וייבוא — רק למחנכת הכיתה.',
  studentsListSorted: 'רשימת תלמידות',
  studentsSortByFamilyHint:
    'מיון לפי שם משפחה (המילה הראשונה) — א׳ עד ת׳. הזנה ידנית: קודם משפחה, אחר כך שם פרטי (למשל: בלאק שירה).',
  familyNameCol: 'שם משפחה',
  firstNameCol: 'שם פרטי',
  myStudentsTitle: 'התלמידות שלי',
  myStudentsHint:
    'הוספה ידנית או ייבוא מקובץ — רק שם וכיתה. שיוך לקבוצות חשבון/אנגלית וכו׳ — למטה ב«קבוצות לימוד».',
  myStudentsNoClass: 'עדיין לא שויכת כמחנכת לכיתה — פני למנהלת.',
  myClass: 'הכיתה שלי',
  importStudents: 'ייבוא מקובץ',
  importStudentsHint:
    'Excel / Word / CSV — שתי עמודות: «שם משפחה» + «שם פרטי», או עמודה אחת «שם מלא» (כהן רחל). שם משפחה בת שתי מילים — חברי במקף: בן-דוד. הקובץ יכול לכלול כותרות ושורות ריקות — המערכת תדלג עליהן אוטומטית.',
  importing: 'מייבא…',
  importedCount: (n: number) => `יובאו ${n} תלמידות`,
  edit: 'עריכה',
  passwordLeaveBlank: 'סיסמה חדשה (ריק = ללא שינוי)',
  studentsByClassTitle: 'תלמידים לפי כיתה',
  studentsNeedClass: 'אין כיתות — עברי ל«כיתות» וצרי כיתה לפני הוספת תלמידים.',
  studentsList: 'כל התלמידים',
  noStudents: 'אין תלמידים עדיין.',
  noStudentsInClass: 'אין תלמידים בכיתה זו.',
  studentCount: (n: number) => (n === 1 ? 'תלמידה אחת' : `${n} תלמידות`),
  createClass: 'יצירת כיתה',
  className: 'שם כיתה',
  addClass: 'הוספת כיתה',
  deleteClass: 'מחיקת כיתה',
  students: 'תלמידים',
  fullName: 'שם מלא',
  fullNamePlaceholder: 'משפחה ושם פרטי (למשל: בן-דוד שירה)',
  addStudent: 'הוספת תלמיד',
  yearGregorian: 'שנה לועזית',
  yearHebrew: 'מחזור (שנה עברית, למשל תשפ״ה)',
  homeroomTeacher: 'מחנך/ת הכיתה',
  noHomeroom: 'ללא מחנך/ת',
  homeroomCol: 'מחנך/ת',

  usersTitle: 'משתמשים',
  usersGroupedHint: 'המשתמשים מוצגים לפי תפקיד — לא ברשימה אחת.',
  usersByRoleTitle: 'משתמשים לפי תפקיד',
  noUsers: 'אין משתמשים עדיין.',
  noUsersInRole: 'אין משתמשים בתפקיד זה.',
  userCount: (n: number) => (n === 1 ? 'משתמש אחד' : `${n} משתמשים`),
  createUser: 'יצירת משתמש',
  role: 'תפקיד',
  roleAdmin: 'מנהל',
  roleHomeroom: 'מחנך/ת',
  roleSubject: 'מורה מקצוע',
  subjectTeacherPickSubjects:
    'בחרי את המקצועות הספציפיים של המורה (מחולק לפי קטגוריה):',
  subjectTeacherNeedSubjects: 'קודם צרי מקצועות ב«מקצועות».',
  subjectTeachersListHint: 'מוצג לפי קטגוריה; בעמודת מקצועות — רשימת המקצועות של כל מורה.',
  teacherSubjectsCol: 'מקצועות',
  noSubjectsAssigned: 'מורות ללא מקצועים משויכים',
  homeroomListHint: 'ממוין א׳–ב׳. מוצגת כיתת החינוך.',
  homeroomClassCol: 'כיתת חינוך',
  subjectTeachersByCategory: 'מורות מקצוע לפי קטגוריה',
  subjectTeachersCategoryHint:
    'לכל מורה מוצגות הקטגוריות שלה (לא מקצועות בודדים). מיון א׳–ב׳.',
  noCategoryAssigned: 'מורות ללא קטגוריה',
  teacherAssignmentsTitle: 'שיוך מורה מקצועית לכיתה / קבוצה',
  teacherAssignmentsHint:
    'מורה → כיתה → סמני מקצוע. לחשבון/אנגלית עם קבוצות — יופיעה רשימה: בחרי קבוצה אחת (א1, א2…).',
  assignmentPerSubjectGroupHint:
    'אחרי «ניהול קבוצות» בכיתות (עם מקצוע לכל קבוצה): סמני חשבון → בחרי קבוצת חשבון מהרשימה.',
  assignmentGroupForSubject: (subject: string) => `בחרי קבוצת ${subject}:`,
  assignmentPickGroupRequired: 'חובה לבחור קבוצה מהרשימה',
  assignmentGroupsInClassTitle: 'קבוצות בכיתה שנבחרה:',
  assignmentNoGroupsForSubject: (subject: string) =>
    `למקצוע «${subject}» אין קבוצות בכיתה — המורה לכל הכיתה.`,
  assignmentUnlinkedGroups:
    'יש קבוצות בלי מקצוע משויך — ב«כיתות» מחקי וצרי מחדש עם בחירת מקצוע (חשבון/אנגלית).',
  assignmentPickClassFirst: 'בחרי כיתה לפני סימון מקצועות.',
  assignmentPickTeacherSubjects: 'מקצועות המורה לשיוך לכיתה זו:',
  assignmentNoTeacherSubjects:
    'למורה לא שויכו מקצועים — ערכי ביצירת המורה ב«משתמשים».',
  assignmentTeacher: 'מורה',
  assignmentSubject: 'מקצוע',
  assignmentClass: 'כיתה',
  assignmentGroup: 'קבוצה (אופציונלי)',
  addAssignment: 'הוספת שיוך',
  assignmentWholeClass: 'כל הכיתה',
  assignmentsList: 'שיוכים קיימים',

  certificatePrefsTitle: 'מבנה תעודה',
  certificatePrefsHint:
    'בחרי אילו שדות יופיעו בתעודה המודפסת. לכל סעיף — האם המילוי בכתב יד (תא ריק להדפסה) או במחשב (נתונים מהמערכת). השינויים חלים על הפקות חדשות.',
  schoolPageIntro:
    'בעמוד זה מגדירים את שם בית הספר ואת מבנה התעודה. «מבנה תעודה» הוא אוסף הגדרות לשימוש חוזר — אילו מקצועות ואילו שדות יופיעו בתעודה. אפשר ליצור כמה מבנים (למשל לכיתות א–ד ולכיתות ה–ו) ולשייך אותם לכיתות.',
  schoolStepName: 'שם בית הספר',
  schoolStepProfile: 'בחירת מבנה תעודה',
  schoolStepProfileHint: 'בחרי מבנה קיים לעריכה, או צרי מבנה חדש. ההגדרות שתשני בהמשך חלות על המבנה שנבחר כאן.',
  schoolStepSubjects: 'מקצועות במבנה זה',
  schoolStepFields: 'שדות שיופיעו בתעודה',
  schoolStepFieldsHint:
    'הפעילי או כבי כל שדה בעזרת המתג. לשדות פעילים בחרי אם הערך יודפס מהמערכת («במחשב») או יישאר תא ריק למילוי בכתב יד.',
  schoolActiveProfileBadge: 'עורכת כעת:',
  certFillModeHint:
    'בכתב יד: התא נשאר ריק ב-PDF (בלי קו מקף). במחשב: מוצגים נתונים מהמערכת; אם חסר — מקף.',
  certFillModeLabel: 'אופן מילוי',
  certFillHandwritten: 'בכתב יד (תא ריק)',
  certFillComputer: 'במחשב',
  certHeaderFieldsSection: 'פרטי כותרת בתעודה',
  certShowProfileNameOnCertificate: 'הצגת שם פרופיל בתעודה',
  certShowProfileNameOnCertificateHint:
    'שם הפרופיל (למשל «א–ד») יוצג מתחת לכותרת התעודה. ניתן להגדיר שם פרופיל בראש רשימת הפרופילים למעלה.',
  certHeaderFieldsHint:
    'כשהשדה מופיע בתבנית העיצוב — בחרי אם יודפס הערך מהמערכת או קו למילוי בכתב יד.',
  certStudentNameField: 'שם התלמידה',
  certClassNameField: 'כיתה',
  certTermNameField: 'תקופה / מחצית',
  certGradesSection: 'טבלת ציונים',
  certGradesSectionHint: 'ציונים מהמחוון — במחשב; בכתב יד — תאים ריקים להשלמה לאחר הדפסה.',
  certAttendanceSection: 'נוכחות',
  certCommentPerGrade: 'שדה הערה/הערכה ליד כל ציון',
  certCommentPerGradeCategoriesTitle: 'קטגוריות עם שדה הערה ליד הציון',
  certCommentPerGradeCategoriesHint:
    'סמנו לאילו קטגוריות ראשיות יופיע עמודת הערה ליד הציון בתעודה ובטבלאות המילוי. ללא סימון — כל הקטגוריות.',
  certCommentPerGradeCategoriesSelectAll: 'כל הקטגוריות',
  certCommentPerGradeCategoriesClearAll: 'ללא הערות',
  certCommentPerGradeCategoriesCount: (selected: number, total: number) =>
    `${selected} מתוך ${total} קטגוריות`,
  certAbsences: 'חיסורים',
  certLateness: 'איחורים',
  certHourAbsences: 'חיסורי שעות',
  certHourLateness: 'איחורי שעות',
  certEvaluation: 'הערכה',
  certSectionBorder: 'מסגרת בתעודה',
  certGroupBorder: 'מסגרת כוללת',
  certFieldBorder: 'מסגרת לכל שדה',
  certDateBorder: 'מסגרת סביב התאריך',
  certHomeroomComment: 'הערכה',
  certShowClassYearHebrew: 'הצגת מחזור בתעודה (שנה עברית של הכיתה)',
  certSignatures: 'מקום לחתימות',
  certSignatureHomeroom: 'חתימת מחנכת',
  certSignaturePrincipal: 'חתימת מנהל/ת',
  certSignatureParent: 'חתימת הורה',
  certTemplatesPreviewProfile: 'תצוגה לפי מבנה תעודה',
  certTemplatesInjectedBlockHint: 'בלוק שמוצג לפי הגדרות הפרופיל — יופיע בתעודה גם בלי בלוק בתבנית',
  certTemplatesUploadLogo: 'העלאת לוגו',
  certTemplatesLogoUploaded: 'לוגו הועלה',
  certTemplatesFontSize: 'גודל גופן (pt)',
  certTemplatesFontFamily: 'סוג גופן',
  certTemplatesBold: 'כתב מודגש',
  certTemplatesTextAlign: 'יישור',
  certTemplatesStaticText: 'טקסט',
  certTemplatesGradesTablePerCategory: 'טבלת ציונים לפי קטגוריה',
  certTemplatesGradesTableFor: (label: string) => `טבלת ציונים: ${label}`,
  certTemplatesGradesCategory: 'קטגוריית ציונים',
  certTemplatesAllCategories: 'כל הקטגוריות (טבלה אחת)',
  certTemplatesShowTableHeader: 'שורת כותרת בטבלה',
  certTemplatesColumnHeaders: 'כותרות עמודות',
  certTemplatesColumnSubject: 'עמודת מקצוע',
  certTemplatesColumnGrade: 'עמודת ציון',
  certTemplatesColumnComment: 'עמודת הערה',
  certTemplatesColumnCommentHint:
    'עמודת ההערה מוצגת רק כשהערות לציונים מופעלות בהגדרות בית הספר',
  certTemplatesEvaluationTitle: 'כותרת הערכה',
  certTemplatesSignatureHomeroom: 'חתימת המחנכת',
  certTemplatesSignaturePrincipal: 'חתימת המנהלת',
  certTemplatesSignatureParent: 'חתימת ההורים',
  certTemplatesAttendanceFields: 'שדות נוכחות (בנפרד)',
  certTemplatesSignatureFields: 'שדות חתימה + תאריך (בנפרד)',
  certTemplatesCompositeBlocks: 'בלוקים כוללים (גרירה אחת)',
  certTemplatesCompositeAttendance: 'נוכחות — בלוק כולל',
  certTemplatesCompositeSignatures: 'חתימות + תאריך — בלוק כולל',
  certTemplatesCloseProperties: 'סגירת מאפייני בלוק',
  certTemplatesGroupDragHint: 'גררי את הפס העליון כדי להזיז את כל השדות יחד',
  certTemplatesGroupSelectHint: 'לחצי על הפס הסגול למעלה לעריכת כל השדות יחד',
  certTemplatesFieldPartOfGroup:
    'שדה בודד בבלוק כולל. לעריכת כל השדות יחד לחצי על הפס הסגול למעלה.',
  certTemplatesGroupShowField: 'הצג שדה',
  certTemplatesSignatureLabel: 'תווית חתימה',
  certTemplatesSignatureType: 'סוג חתימה',
  certTemplatesDateFormat: 'פורמט תאריך',
  certTemplatesFieldType: 'סוג שדה',
  certTemplatesAttendanceLabel: 'תווית',
  certTemplatesWizard: 'אשף תעודה מוכנה',
  certTemplatesWizardHint:
    'מסדר אוטומטית כותרת, טבלאות לפי קטגוריות, נוכחות, חתימות ועוד — בסימטריה. ניתן לערוך אחר כך ידנית.',
  certTemplatesWizardConfirm:
    'האשף יחליף את כל הבלוקים הנוכחיים בתבנית מסודרת. להמשיך?',
  certTemplatesWizardApplied: 'התעודה המוכנה הוחלה — ערכי ושמרי.',
  certTemplatesDesignerHint:
    'גררי בלוקים לשינוי מיקום. המיקומים נשמרים בתעודה כפי שמופיעים כאן.',
  certTemplatesShowSubCategoryRows: 'הצג כותרות תת-קטגוריה בטבלה (בנוסף לקטגוריה)',
  certTemplatesPageSettings: 'הגדרות דף',
  certTemplatesSectionWizard: 'אשף מהיר',
  certTemplatesSectionBlocks: 'הוספת בלוקים',
  certTemplatesSectionBasicBlocks: 'בסיסי',
  certTemplatesSectionProperties: 'מאפייני בלוק',
  certTemplatesSelectBlockHint: 'לחצי על בלוק בעיצוב כדי לערוך אותו',
  certTemplatesDesignerToolbar: 'פעולות',
  certTemplatesPageBackgroundColor: 'צבע רקע',
  certTemplatesUploadBackground: 'העלאת תמונת רקע',
  certTemplatesBackgroundUploaded: 'תמונת רקע הועלתה',
  certTemplatesBackgroundMode: 'מצב תמונת רקע',
  certTemplatesBackgroundModeNone: 'ללא תמונה',
  certTemplatesBackgroundModeFull: 'מלא לדף',
  certTemplatesBackgroundModeCorner: 'פינה (ימין למעלה)',
  certTemplatesBackgroundFit: 'התאמת תמונה',
  certTemplatesBackgroundFitCover: 'מילוי (cover)',
  certTemplatesBackgroundFitContain: 'הכלה (contain)',
  certTemplatesRemoveBackground: 'הסרת תמונת רקע',
  certDate: 'תאריך בתעודה',
  certShowSubjectGroup: 'בתעודה: שם מקצוע + קבוצה (למשל חשבון-א1)',
  certShowSubjectGroupHint:
    'רלוונטי למקצוע עם קבוצות בכיתה — יודפס «שם מקצוע-שם קבוצה». בלי סימון: רק שם המקצוע.',
  certShowSubCategories:
    'הצגת תת-קטגוריות בתעודה ובטבלאות (למשל «מדעים» ו«יהדות» תחת «לימודי»)',
  certShowSubCategoriesHint:
    'כבוי — כל המקצועות יופיעו תחת הקטגוריה הראשית בלבד (למשל רק «הליכות»).',

  roleLabel: (role: string) => {
    switch (role) {
      case 'admin':
        return 'מנהל';
      case 'homeroom_teacher':
        return 'מחנך/ת';
      case 'subject_teacher':
        return 'מורה מקצוע';
      default:
        return role;
    }
  },

  confirmYes: 'כן, בצע',
  confirmNo: 'ביטול',
  deleteConfirm: 'בטוח למחוק?',

  toastSaved: 'נשמר בהצלחה',
  toastDeleted: 'נמחק בהצלחה',
  toastCreated: 'נוצר בהצלחה',

  nikudUnavailable: 'שירות הניקוד אינו זמין — נדרש חיבור לאינטרנט. בדקי את החיבור ונסי שוב.',

  certPrefNikud: 'תעודה מנוקדת',
  certPrefNikudHint: 'מתאים כאשר הטקסט (שמות תלמידים/ות, מקצועות) מוקלד עם ניקוד — ישנה גופן ומרווח שורה',

  navHelp: 'מדריך שימוש',

  helpBadgeOnce: 'פעם אחת',
  helpBadgePeriod: 'כל תקופה',
  helpFaqTitle: 'שאלות נפוצות',

  // ── Admin help (/help) ──────────────────────────────────────────────────
  adminHelpTitle: 'מדריך למנהלת',
  adminHelpDesc: 'סדר הגדרה ותפעול — מהגדרה ראשונית ועד הפקת תעודות',

  adminPhase1Title: 'הגדרה ראשונית',
  adminPhase1Steps: [
    { text: 'קטגוריות ציונים — לימודי, התנהגות, מיומנויות...', href: '/grading-sets' },
    { text: 'סטי ציונים — מצוין, טוב מאוד, טוב... (לכל קטגוריה)', href: '/grading-sets' },
    { text: 'מקצועות — שם מקצוע + קטגוריה', href: '/subjects' },
    { text: 'פרופיל תעודה — מה יופיע בתעודה: מקצועות, נוכחות, חתימות, האם מנוקדת', href: '/school' },
    { text: 'משתמשים — חשבונות לכל המורות (קודם, כדי לשייך לכיתות!)', href: '/users' },
    { text: 'כיתות — יצירה + שיוך מחנכת + שיוך פרופיל תעודה + הגדרת קבוצות לימוד לפי מקצוע', href: '/classes' },
  ],

  adminPhase2Title: 'עיצוב תעודה',
  adminPhase2Steps: [
    { text: 'עיצוב תעודות — צרי תבנית חדשה ושייכי אותה לפרופיל תעודה (בחלון היצירה)', href: '/certificate-templates' },
    { text: 'פתחי את התבנית לעריכה → לחצי "אשף תעודה מוכנה": האשף מסדר אוטומטית כותרת, טבלאות מקצועות, נוכחות וחתימות לפי הפרופיל המשויך', href: '/certificate-templates' },
    { text: 'לאחר האשף — ניתן לגרור ולשנות כל אלמנט ידנית, להוסיף לוגו, לשנות צבעים וגופנים', href: '/certificate-templates' },
  ],

  adminPhase3Title: 'פתיחת תקופת ציון',
  adminPhase3Steps: [
    { text: 'צרי תקופת ציון: שם + תאריכים', href: '/gradebook' },
    { text: 'המחנכת מוסיפה תלמידות לכיתה + משייכת לקבוצות לימוד', href: null },
  ],

  adminPhase4Title: 'מעקב ונעילה',
  adminPhase4Steps: [
    { text: 'ניתן לצפות במחוון הציונים של כל הכיתות', href: '/gradebook' },
    { text: 'לאחר סיום מילוי ציונים — נעלי תקופת ציון', href: '/gradebook' },
    { text: 'לאחר נעילה — ניתן לצפות בתעודות שהמחנכות הפיקו', href: '/certificates' },
  ],

  adminFaqItems: [
    { q: 'למה יוצרים משתמשים לפני כיתות?', a: 'כדי לשייך מחנכת לכיתה — המחנכת חייבת להיות קיימת במערכת.' },
    { q: 'איפה מגדירים קבוצות לימוד (למשל ניקוד א׳/ב׳)?', a: 'כיתות → בחרי כיתה → ניהול קבוצות (לפי מקצוע).' },
    { q: 'מי מפיק תעודות?', a: 'המחנכת — המנהלת יכולה רק לצפות בתעודות לאחר הפקה.' },
    { q: 'מי מוסיפה תלמידות?', a: 'המחנכת — בפורטל המחנכת, דף "התלמידות שלי".' },
    { q: 'מי ממלאת ציונים?', a: 'מחנכת (כל מקצועות הכיתה) או מורה מקצועית (מקצועה בלבד).' },
    { q: 'איך שמים לוגו על התעודה?', a: 'עיצוב תעודות → לחצי על שם התבנית → "לוגו בית ספר".' },
  ],

  // ── Homeroom help (/help/homeroom) ──────────────────────────────────────
  homeroomHelpTitle: 'מדריך למחנכת',
  homeroomHelpDesc: 'הוספת תלמידות, מילוי ציונים והפקת תעודות',

  homeroomPhase1Title: 'הגדרה ראשונית (פעם אחת בשנה)',
  homeroomPhase1Steps: [
    { text: 'התלמידות שלי — הוספת תלמידות לכיתה (ידנית או ייבוא מקובץ)', href: '/my-students' },
    { text: 'שיוך כל תלמידה לקבוצות לימוד לפי מקצוע (ניקוד א׳/ב׳ וכדומה)', href: '/my-students' },
  ],

  homeroomPhase2Title: 'מילוי ציונים',
  homeroomPhase2Steps: [
    { text: 'פורטל מחנכת → מחוון → בחרי כיתה ותקופה', href: '/teacher' },
    { text: 'מלאי ציוני מקצועות, התנהגות, נוכחות והערות לכל התלמידות', href: '/teacher' },
    { text: 'מורות מקצועיות יכולות למלא את מקצועותיהן בפורטל המורה — הציונים יופיעו אוטומטית במחוון שלך', href: null },
  ],

  homeroomPhase3Title: 'הפקת תעודות',
  homeroomPhase3Steps: [
    { text: 'המנהלת נועלת תקופת ציון — רק אז ניתן להפיק', href: null },
    { text: 'פורטל מחנכת → תעודות → בחרי כיתה + תקופה → הפיקי', href: '/teacher/certificates' },
    { text: 'ניתן לצפות, להדפיס ולשתף כל תעודה', href: '/teacher/certificates' },
  ],

  homeroomFaqItems: [
    { q: 'תלמידה לא מופיעה בציונים?', a: 'יש לוודא שהיא שויכה לקבוצת הלימוד של אותו מקצוע.' },
    { q: 'מה ממלאת המחנכת לעומת מורה מקצועית?', a: 'מחנכת — כל מקצועות הכיתה + התנהגות + נוכחות. מורה מקצועית — מקצועה בלבד.' },
    { q: 'למה לא ניתן להפיק תעודה?', a: 'תקופת הציון טרם נעולה על ידי המנהלת.' },
    { q: 'האם אפשר להפיק תעודה בודדת?', a: 'כן — לחצי על שם התלמידה ברשימת התעודות.' },
  ],

  // ── Subject teacher help (/help/teacher) ────────────────────────────────
  teacherHelpTitle: 'מדריך למורה מקצועית',
  teacherHelpDesc: 'מילוי ציונים במקצועות שלך',

  teacherPhase1Title: 'מילוי ציונים',
  teacherPhase1Steps: [
    { text: 'פורטל מורה → בחרי כיתה ותקופת ציון', href: '/teacher' },
    { text: 'בחרי מקצוע — תראי רק את המקצועות שמשויכים אלייך', href: '/teacher' },
    { text: 'מלאי ציונים לתלמידות בקבוצות שלך ושמרי', href: '/teacher' },
  ],

  teacherFaqItems: [
    { q: 'תלמידה לא מופיעה ברשימה?', a: 'המחנכת צריכה לשייך אותה לקבוצת הלימוד של מקצועך.' },
    { q: 'לא רואה מקצוע?', a: 'המנהלת צריכה לשייך אותך למקצוע זה (משתמשים → שיוכי מורה).' },
    { q: 'מתי הציונים נעולים?', a: 'כאשר המנהלת נועלת את תקופת הציון — לא ניתן לערוך לאחר מכן.' },
    { q: 'האם אפשר לראות את ציוני שאר המקצועות?', a: 'לא — כל מורה רואה רק את מקצועותיה.' },
  ],

};

export function translateApiError(message: string): string {
  const m = message.trim();
  if (m === 'Unauthorized' || m === 'Invalid credentials') return he.invalidCredentials;
  if (m === 'Failed to fetch' || m.includes('fetch')) return he.networkError;
  if (m.includes('Nikud service unavailable')) return he.nikudUnavailable;
  if (m === 'Internal server error' || m.includes('Internal server')) {
    return 'שגיאת שרת — הריצי בטרמינל: pnpm db:migrate ואז הפעילי מחדש את pnpm dev';
  }
  if (m === 'SCHOOL_BLOCKED') return he.schoolBlockedLogin;
  if (m === 'SCHOOL_DELETED') return he.schoolDeletedLogin;
  if (m === 'NOT_PLATFORM_USER') return he.missingSchoolId;
  if (m === 'Forbidden') return 'אין הרשאה — יצירת כיתה רק למנהלת. התחברי כמשתמש מנהל.';
  if (
    m.includes('Certificate editing and generation are for homeroom teachers only') ||
    m.includes('Subject teachers cannot generate certificates') ||
    m.includes('Homeroom teacher can only generate for own class')
  ) {
    return 'אין הרשאה — עריכת תעודות והפקתן למחנכת בלבד.';
  }
  if (m.includes('Homeroom teacher is required')) {
    return 'חובה לבחור מחנכת לכיתה.';
  }
  if (m === 'Not Found') return 'לא נמצא';
  if (m === 'Object not found') {
    return 'קובץ התעודה לא נמצא — נסי להפיק את התעודה מחדש';
  }
  if (m.includes('ECONNREFUSED') && m.includes('9000')) {
    return 'MinIO לא רץ. הפעילי: docker compose up -d — או השאירי STORAGE_BACKEND=memory ב-apps/api/.env';
  }
  if (m.includes('Playwright Chromium not installed')) {
    return 'חסר דפדפן ל-PDF. הריצי בטרמינל: cd apps/api && npx playwright install chromium';
  }
  if (m.includes('TERM_LOCKED') || m.includes('Grading term is locked')) {
    return he.termLockedBanner;
  }
  if (m.includes('Grading set ambiguous') || m.includes('סט תוויות')) {
    return he.gradebookAmbiguousHint;
  }
  if (m === 'Term has grade entries') {
    return 'לא ניתן למחוק — יש ציונים בתקופה זו.';
  }
  if (m === 'Term has generated certificates') {
    return 'לא ניתן למחוק — הופקו תעודות לתקופה זו.';
  }
  if (m === 'Term has certificate supplement data') {
    return 'לא ניתן למחוק — יש נתוני תעודה שמורים לתקופה זו.';
  }
  if (m === 'Category has sub-categories') {
    return 'לא ניתן למחוק — לקטגוריה יש תת-קטגוריות.';
  }
  if (m === 'Category is used by subjects') {
    return 'לא ניתן למחוק — קטגוריה משויכת למקצועות.';
  }
  return m;
}

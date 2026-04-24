const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3030;
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || "teacher123";
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");
const PUBLIC_DIR = path.join(__dirname, "public");
const ACCESS_DURATION_DAYS = 30;
const MAX_ACTIVITY_LOG_ITEMS = 12;

const chapterOneQuizzes = [
      {
        id: "1.1",
        question: "Аль сумаар замын өргөнийг үзүүлсэн бэ?",
        options: ["А", "Б", "В", "Г", "Д"],
        answer: 3,
        explanation: "Замын өргөн нь замын нэг талаас нөгөө тал хүртэлх нийт өргөнийг заасан сум тул зөв хариулт нь Г.",
        illustration: "/public/illustrations/chapter-1-real/q1-1.jpeg"
      },
      {
        id: "1.2",
        question: "\"Зорчих хэсэг\" гэж юу вэ?",
        options: [
          "Тээврийн хэрэгслийн хөдөлгөөнд зориулсан замын хэсэг",
          "Явган зорчигчийн хөдөлгөөнд зориулсан замын хэсэг",
          "Зогсоол болон хөдөлгөөнд зориулагдаагүй замын хэсэг"
        ],
        answer: 0,
        explanation: "\"Зорчих хэсэг\" гэдэг нь зөвхөн тээврийн хэрэгсэл явах зориулалттай замын хэсгийг хэлнэ."
      },
      {
        id: "1.3",
        question: "Хоёр зорчих хэсэгтэй замыг заана уу?",
        options: ["Зөвхөн А", "Зөвхөн Б", "А, Б"],
        answer: 1,
        explanation: "Хоорондоо тусгаарлах зурвас, байгууламжаар салсан үед зам хоёр зорчих хэсэгтэйд тооцогдоно. Зурагт энэ нөхцөл Б дээр байна.",
        illustration: "/public/illustrations/chapter-1-real/q1-3.jpeg"
      },
      {
        id: "1.4",
        question: "Зурагт хэдэн эгнээтэй замыг үзүүлсэн бэ?",
        options: ["Нэг эгнээтэй", "Хоёр эгнээтэй", "Гурван эгнээтэй"],
        answer: 1,
        explanation: "Эсрэг чиглэлийн хоёр урсгалд тус бүр нэг эгнээ ногдож байгаа тул энэ нь хоёр эгнээтэй зам.",
        illustration: "/public/illustrations/chapter-1-real/q1-4.jpeg"
      },
      {
        id: "1.5",
        question: "Аль зурагт гол замыг үзүүлсэн бэ?",
        options: ["Зөвхөн А", "Зөвхөн Б", "Зөвхөн В", "Зөвхөн Б, В", "А, Б, В"],
        answer: 4,
        explanation: "Гол замыг тэмдэг, зохион байгуулалт, уулзварын байдлаар нь танина. Энд А, Б, В бүх зурагт гол замын шинж байна.",
        illustration: "/public/illustrations/chapter-1-real/q1-5.jpeg"
      },
      {
        id: "1.6",
        question: "Аль зурагт уулзварыг үзүүлсэн бэ?",
        options: ["Зөвхөн А", "Зөвхөн Б", "А, Б"],
        answer: 0,
        explanation: "Уулзвар нь нэг түвшинд огтлолцож, нийлж, салж байгаа замуудын хэсэг. Энэ шинж зөвхөн А зураг дээр харагдаж байна.",
        illustration: "/public/illustrations/chapter-1-real/q1-6.jpeg"
      },
      {
        id: "1.7",
        question: "Аль нь механикжсан тээврийн хэрэгсэл бэ?",
        options: ["Мотоцикл", "Мопед", "Унадаг дугуй", "Мотоцикл болон мопед", "Дээрх бүгд"],
        answer: 0,
        explanation: "Энэ тестийн ойлголтоор механикжсан тээврийн хэрэгслийн зөв сонголт нь мотоцикл. Унадаг дугуй энэ ангилалд орохгүй."
      },
      {
        id: "1.8",
        question: "\"Чиглэлийн тээврийн хэрэгсэл\" гэж юу вэ?",
        options: [
          "Тогтсон буудал бүхий чиглэлийн дагуу зорчигч тээвэрлэх зориултаар нийтийн үйлчилгээнд явж байгаа автобус, троллейбус",
          "Бүх төрлийн автобус",
          "Хүн тээвэрлэхэд зориулсан тээврийн хэрэгсэл"
        ],
        answer: 0,
        explanation: "\"Чиглэлийн тээврийн хэрэгсэл\" гэдэг нь тогтсон чиглэл, тогтсон буудалтай нийтийн үйлчилгээний автобус, троллейбусыг хэлнэ."
      },
      {
        id: "1.9",
        question: "\"Бүх жин\" гэж юу вэ?",
        options: [
          "Тээврийн хэрэгслийн тухайн үеийн жин",
          "Тээврийн хэрэгслийн техникийн тодорхойлолтоор тогтоосон жин",
          "Тээврийн хэрэгслийн өөрийн жин"
        ],
        answer: 1,
        explanation: "\"Бүх жин\" нь үйлдвэрлэгчийн техникийн тодорхойлолтоор тогтоосон нийт жинг хэлдэг."
      },
      {
        id: "1.10",
        question: "\"Бодит жин\" гэж юу вэ?",
        options: [
          "Тээврийн хэрэгслийн тухайн үеийн жин",
          "Тээврийн хэрэгслийн техникийн тодорхойлолтоор тогтоосон жин",
          "Тээврийн хэрэгслийн даацын жин"
        ],
        answer: 0,
        explanation: "\"Бодит жин\" нь тухайн мөчид ачаа, зорчигч, түлштэйгээ байгаа жин юм."
      },
      {
        id: "1.11",
        question: "Аль нь замын хөдөлгөөнд оролцогч вэ?",
        options: ["Зөвхөн А", "Зөвхөн Б", "Зөвхөн В", "Зөвхөн А, Б", "Бүгд"],
        answer: 3,
        explanation: "Явган зорчигч болон жолооч нь замын хөдөлгөөнд оролцогчид. Харин тухайн зураг дээрх В нь хөдөлгөөнд оролцогчид хамаарахгүй.",
        illustration: "/public/illustrations/chapter-1-real/q1-11.jpeg"
      },
      {
        id: "1.12",
        question: "Хэнийг \"Жолооч\"-д хамааруулж ойлгох вэ?",
        options: [
          "Жолоодлогын дадлага хийлгэж яваа багш",
          "Ердийн хөсөг хөтөлж яваа хүн",
          "Унадаг дугуй унаж яваа хүн",
          "Дээрх бүгд хамааруулж ойлгоно"
        ],
        answer: 3,
        explanation: "Дүрмийн ойлголтоор жолооч гэдэгт зөвхөн автомашин барьж яваа хүн биш, жолоодлогын багш, ердийн хөсөг хөтлөгч, унадаг дугуйчин ч орно."
      },
      {
        id: "1.13",
        question: "Аль нь \"Үзэгдэл хангалтгүй нөхцөл\" вэ?",
        options: [
          "Утаа тоос боссоноос 300 м-ийн дотор зам харагдахгүй болсон нөхцөл",
          "Байгалийн тогтоц, газрын тэгш бус байдлаас замын дагуух үзэгдэх орчин хязгаарлагдсан байдал"
        ],
        answer: 0,
        explanation: "\"Үзэгдэл хангалтгүй нөхцөл\" нь цаг агаар, утаа, тоосноос шалтгаалан ойрын зайд зам харагдахгүй болсон байдлыг хэлнэ."
      },
      {
        id: "1.14",
        question: "\"Байр эзлэх\" гэж юу вэ?",
        options: [
          "Тээврийн хэрэгслийг зогсоолд байрлуулах үйлдэл",
          "Явж байгаа чигтээ эгнээ байраа солих үйлдэл",
          "Замаас гарах буюу замд нийлэх үйлдэл"
        ],
        answer: 1,
        explanation: "\"Байр эзлэх\" гэдэг нь хөдөлгөөн дундаа өөрийн эгнээ, байрыг солих үйлдэл юм."
      },
      {
        id: "1.15",
        question: "Аль зурагт \"Гүйцэж түрүүлэх\" үйлдлийг үзүүлсэн бэ?",
        options: ["Зөвхөн А", "Зөвхөн Б", "Зөвхөн А, Б"],
        answer: 0,
        explanation: "Гүйцэж түрүүлэх нь урд яваа тээврийн хэрэгслийг эсрэг урсгалын талд орж давж гарах үйлдэл. Энэ нь А зурагт л байна.",
        illustration: "/public/illustrations/chapter-1-real/q1-15.jpeg"
      },
      {
        id: "1.16",
        question: "Зурагт аль үйлдлийг үзүүлсэн бэ?",
        options: ["Гүйцэх үйлдэл", "Гүйцэж түрүүлэх үйлдэл", "Саадыг тойрон гарах үйлдэл"],
        answer: 0,
        explanation: "Энд нэг чигийн урсгал дотор урд яваа тээврийн хэрэгслийг давж өнгөрч байгаа тул энэ нь гүйцэх үйлдэл.",
        illustration: "/public/illustrations/chapter-1-real/q1-16.jpeg"
      },
      {
        id: "1.17",
        question: "Аль нь \"Саадыг тойрон гарах\" үйлдэл вэ?",
        options: [
          "Хориглосон дохиогоор зогсож байгаа тээврийн хэрэгслийг тойрон гарах",
          "Хөдөлгөөний түгжрэлд зогсож байгаа тээврийн хэрэгслийг тойрон гарах",
          "Зайлшгүй зогсолт хийсэн тээврийн хэрэгслийг тойрон гарах",
          "Дээрх бүгд"
        ],
        answer: 2,
        explanation: "Саадыг тойрон гарах гэдэг нь хөдөлгөөнд оролцох боломжгүй болсон саадыг тойрч өнгөрөхийг хэлнэ. Зайлшгүй зогсолт хийсэн тээврийн хэрэгсэл ийм саад болно."
      },
      {
        id: "1.18",
        question: "Суудлын автомашин жолооч \"Зам тавьж өгөх\" үйлдлийг зөв гүйцэтгэсэн үү?",
        options: ["Тийм", "Үгүй", "Хурдаа хасаж, зогсож өнгөрүүлсэн бол зөв"],
        answer: 1,
        explanation: "\"Зам тавьж өгөх\" гэдэг нь зөвхөн хурд сааруулах биш, нөгөө тээврийн хэрэгслийн хөдөлгөөнд саад болохгүйгээр бүрэн боломж олгохыг хэлнэ. Энэ зурагт зөв хэрэгжээгүй.",
        illustration: "/public/illustrations/chapter-1-real/q1-18.jpeg"
      },
      {
        id: "1.19",
        question: "Ачаа буулгаж 15 минут зогссон бол ямар үйлдэл хийсэнд тооцогдох вэ?",
        options: ["Түр зогсолт", "Удаан зогсолт", "Зайлшгүй зогсолт"],
        answer: 0,
        explanation: "Ачаа ачих, буулгахтай холбоотой богино хугацааны зогсолтыг түр зогсолтод тооцно. Энэ асуултад зөв сонголт нь түр зогсолт.",
        illustration: "/public/illustrations/chapter-1-real/q1-19.jpeg"
      },
      {
        id: "1.20",
        question: "Дараах үйлдлүүдийн аль нь \"Зайлшгүй зогсолт\"-д хамаарагдах вэ?",
        options: [
          "Хориглосон дохиогоор тээврийн хэрэгслээ зогсоох",
          "Ачаа буулгах шаардлагаар тээврийн хэрэгслээ зогсоох",
          "Зорчигчийн биеийн байдал муудсаны улмаас тээврийн хэрэгслээ зогсоох",
          "Дээрх бүх үйлдэл хамаарагдана"
        ],
        answer: 2,
        explanation: "Зайлшгүй зогсолт нь жолоочийн хүсэлтээс бус, техникийн гэмтэл, аюул, зорчигчийн биеийн байдал зэрэг шалтгаанаар хийх зогсолт байдаг."
      }
];

const chapterThirteenQuizzes = [
  {
    id: "7.11",
    question: "Зурагт үзүүлсэн сумны дагуу хөдөлгөөнөө үргэлжлүүлэхийг зөвшөөрөх үү?",
    options: ["Зөвшөөрнө", "Хориглоно"],
    answer: 0,
    illustration: "/public/illustrations/chapter-13/q7-11.jpeg"
  },
  {
    id: "7.12",
    question: "Зурагт үзүүлсэн сумны дагуу хөдөлгөөнөө үргэлжлүүлэхийг зөвшөөрөх үү?",
    options: ["Зөвшөөрнө", "Хориглоно"],
    answer: 1,
    illustration: "/public/illustrations/chapter-13/q7-12.jpeg"
  },
  {
    id: "7.13",
    question: "Баруун гар талын эгнээнээс аль чигт явахыг зөвшөөрөх вэ?",
    options: ["Зөвхөн чигээрээ", "Зөвхөн баруун гар тийш", "Чигээрээ буюу баруун гар тийш"],
    answer: 2,
    illustration: "/public/illustrations/chapter-13/q7-13.jpeg"
  },
  {
    id: "7.14",
    question: "Та чигээрээ явах зорилгоор дунд эгнээнд байр эзэлсэн бол ямар арга хэмжээ авах вэ?",
    options: [
      "Хөдөлгөөнөө үргэлжлүүлж чигээрээ нэвтэрнэ",
      "Өөрийн явах чигийг үл харгалзан зүүн гар тийш эргэнэ",
      "\"Зогс-шугам\"-ын өмнө зогсож, үндсэн ногоон гэрэл дохио асахыг хүлээнэ"
    ],
    answer: 2,
    illustration: "/public/illustrations/chapter-13/q7-14.jpeg"
  },
  {
    id: "7.15",
    question: "Шар гэрэл дохио асах үед уулзвар руу орохыг зөвшөөрөх үү?",
    options: [
      "Зөвшөөрнө",
      "Хориглоно",
      "Уулзварын өмнө огцом тормослохгүйгээр зогсох боломжтой тохиолдолд хориглоно"
    ],
    answer: 2,
    illustration: "/public/illustrations/chapter-13/q7-15.jpeg"
  },
  {
    id: "7.16",
    question: "Суудлын автомашины жолооч шар гэрэл дохио асах үед уулзвар руу орсон бол зөрчил гаргасанд тооцох уу?",
    options: [
      "Тооцно",
      "Огцом тоормослохоос зайлсхийж орсон бол тооцохгүй"
    ],
    answer: 1,
    illustration: "/public/illustrations/chapter-13/q7-16.jpeg"
  },
  {
    id: "7.17",
    question: "Зөвшөөрсөн гэрэл дохиогоор уулзварт орсон жолооч уулзварыг нэвтэрч амжаагүй байхад дохио өөрчлөгдвөл ямар арга хэмжээ авах вэ?",
    options: [
      "Уулзварт зогсож, дараагийн зөвшөөрөх дохиог хүлээнэ",
      "Аюулгүй байдлыг хангаж хөдөлгөөнөө үргэлжлүүлнэ",
      "Ухарч зохих байраа эзэлнэ"
    ],
    answer: 1,
    illustration: "/public/illustrations/chapter-13/q7-17.jpeg"
  },
  {
    id: "7.18",
    question: "Зөвшөөрсөн гэрэл дохиогоор \"Зогс-шугам\"-ыг давах үед дохио өөрчлөгдсөн бол хөдөлгөөнөө үргэлжлүүлэхийг зөвшөөрөх үү?",
    options: [
      "Зөвшөөрнө",
      "Уулзварт орж амжаагүй байгаа энэ тохиолдолд хориглоно"
    ],
    answer: 0,
    illustration: "/public/illustrations/chapter-13/q7-18.jpeg"
  },
  {
    id: "7.19",
    question: "Зурагт үзүүлсэн сумны дагуу уулзварыг нэвтрэхдээ аль гэрлэн дохионы заалтыг мөрдөх шаардлагатай вэ?",
    options: ["Зөвхөн А", "Зөвхөн Б", "А, Б"],
    answer: 0,
    illustration: "/public/illustrations/chapter-13/q7-19.jpeg"
  },
  {
    id: "7.20",
    question: "Анивчсан шар гэрэл дохио ямар утгатай вэ?",
    options: [
      "Хөдөлгөөнийг бүх чигт хориглоно",
      "Хөдөлгөөнийг зөвшөөрөх бөгөөд уулзвар зохицуулагдаагүй болсныг мэдээлж болгоомжтой явахыг анхааруулна",
      "Гэрэл дохио солигдох гэж байгааг анхааруулна"
    ],
    answer: 1,
    illustration: "/public/illustrations/chapter-13/q7-20.jpeg"
  },
  {
    id: "7.21",
    question: "Зохицуулагчийн энэ дохио ямар утгатай вэ?",
    options: [
      "Зөвхөн чигээрээ явахыг зөвшөөрнө",
      "Зөвхөн чигээрээ явах буюу баруун гар тийш эргэхийг зөвшөөрнө",
      "Уулзвар руу орохыг хориглоно"
    ],
    answer: 2,
    illustration: "/public/illustrations/chapter-13/q7-21.jpeg"
  },
  {
    id: "7.22",
    question: "Энэ тохиолдолд та ямар арга хэмжээ авах вэ?",
    options: [
      "Зогс-шугам тэмдэглэлийн өмнө очиж зогсоно",
      "Баруун гар талын хашилганд шахаж, бусдын хөдөлгөөнд саад болохгүй тохиромжтой байрлал сонгож зогсоно",
      "Буцаж эргэнэ"
    ],
    answer: 0,
    illustration: "/public/illustrations/chapter-13/q7-22.jpeg"
  },
  {
    id: "7.23",
    question: "Зохицуулагч дохиураа өргөх үед уулзвар руу орохыг зөвшөөрөх үү?",
    options: [
      "Хориглоно",
      "Уулзварын өмнө огцом тоормослохгүйгээр зогсох боломжгүй бол зөвшөөрнө"
    ],
    answer: 1,
    illustration: "/public/illustrations/chapter-13/q7-23.jpeg"
  },
  {
    id: "7.24",
    question: "Энэ тохиолдолд зүүн гар тийш эргэхийг зөвшөөрөх үү?",
    options: ["Зөвшөөрнө", "Хориглоно"],
    answer: 1,
    illustration: "/public/illustrations/chapter-13/q7-24.jpeg"
  },
  {
    id: "7.25",
    question: "Аль чигт явахыг зөвшөөрөх вэ?",
    options: [
      "Зөвхөн Б",
      "Зөвхөн В",
      "Зөвхөн Б, В",
      "А, Б, В",
      "Уулзвар руу орохыг хориглоно"
    ],
    answer: 2,
    illustration: "/public/illustrations/chapter-13/q7-25.jpeg"
  },
  {
    id: "7.26",
    question: "Таныг аль чигт явахыг хориглох вэ?",
    options: [
      "Бүх чигт",
      "Зөвхөн зүүн гар тийш болон буцаж эргэх чигт",
      "Баруун гар тийш эргэхээс бусад чигт"
    ],
    answer: 2,
    illustration: "/public/illustrations/chapter-13/q7-26.jpeg"
  },
  {
    id: "7.27",
    question: "Аль чигт явахыг зөвшөөрөх вэ?",
    options: ["Зөвхөн Б", "Зөвхөн А, Б", "Зөвхөн Б, В", "А, Б, В"],
    answer: 2,
    illustration: "/public/illustrations/chapter-13/q7-27.jpeg"
  },
  {
    id: "7.28",
    question: "Аль тээврийн хэрэгслийн хөдөлгөөнийг зөвшөөрөх вэ?",
    options: ["Зөвхөн А", "Зөвхөн Б", "Зөвхөн В", "А, В", "Б, В"],
    answer: 4,
    illustration: "/public/illustrations/chapter-13/q7-28.jpeg"
  },
  {
    id: "7.29",
    question: "Аль тээврийн хэрэгслийн хөдөлгөөнийг зөвшөөрөх вэ?",
    options: ["Зөвхөн А", "Зөвхөн Б", "Зөвхөн Б, В", "Зөвхөн А, Б", "А, Б, В"],
    answer: 0,
    illustration: "/public/illustrations/chapter-13/q7-29.jpeg"
  },
  {
    id: "7.30",
    question: "Аль тээврийн хэрэгслийн жолооч \"Зогс-шугам\" тэмдэглэлийн өмнө зогсох шаардлагатай вэ?",
    options: ["Зөвхөн мотоцикл", "Зөвхөн суудлын автомашин", "Хоёул"],
    answer: 2,
    illustration: "/public/illustrations/chapter-13/q7-30.jpeg"
  }
];

const quizGroups = Array.from({ length: 20 }, (_, index) => {
  const chapterNumber = index + 1;
  const active = chapterNumber === 1 || chapterNumber === 13;
  const chapterKey = `chapter-${chapterNumber}`;
  const quizzesByChapter = {
    "chapter-1": chapterOneQuizzes,
    "chapter-13": chapterThirteenQuizzes
  };
  return {
    id: chapterKey,
    title: `${chapterNumber}-р бүлэг`,
    description:
      chapterNumber === 1
        ? "Замын хөдөлгөөний дүрмийн үндсэн ойлголтын 20 асуулт"
        : chapterNumber === 13
          ? "Зохицуулагч болон гэрлэн дохионы нөхцөлтэй 20 асуулт"
          : `${chapterNumber}-р бүлгийн асуултууд удахгүй нэмэгдэнэ`,
    quizzes: quizzesByChapter[chapterKey] || []
  };
});

function getQuizGroup(groupId) {
  return quizGroups.find((group) => group.id === groupId) || quizGroups[0];
}

function toPublicQuiz(quiz) {
  return {
    id: quiz.id,
    question: quiz.question,
    options: quiz.options,
    illustration: quiz.illustration || null
  };
}

function ensureStudentTracking(student) {
  student.chapterProgress =
    student.chapterProgress && typeof student.chapterProgress === "object"
      ? student.chapterProgress
      : {};
  student.activityLog = Array.isArray(student.activityLog) ? student.activityLog : [];
  student.lastLoginAt = student.lastLoginAt || null;
  student.lastActivityAt = student.lastActivityAt || null;
  return student;
}

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      students: [],
      sessions: [],
      teacherSessions: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
  }
}

function loadStore() {
  ensureStorage();
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  const data = JSON.parse(raw);
  data.students = Array.isArray(data.students) ? data.students.map(ensureStudentTracking) : [];
  data.sessions = Array.isArray(data.sessions) ? data.sessions : [];
  data.teacherSessions = Array.isArray(data.teacherSessions) ? data.teacherSessions : [];
  return data;
}

function saveStore(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function pruneExpiredAccess(data) {
  const now = Date.now();
  data.students = data.students.filter((student) => new Date(student.expiresAt).getTime() > now);
  const activeStudentIds = new Set(data.students.map((student) => student.id));
  data.sessions = data.sessions.filter((session) => activeStudentIds.has(session.studentId));
  data.teacherSessions = data.teacherSessions.filter((session) => Boolean(session.token));
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      sendJson(res, 404, { error: "File not found" });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const typeMap = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".jpeg": "image/jpeg",
      ".jpg": "image/jpeg",
      ".png": "image/png",
      ".svg": "image/svg+xml; charset=utf-8"
    };

    res.writeHead(200, {
      "Content-Type": typeMap[ext] || "application/octet-stream"
    });
    res.end(content);
  });
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 1e6) {
        req.socket.destroy();
        reject(new Error("Request too large"));
      }
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON"));
      }
    });

    req.on("error", reject);
  });
}

function generateAccessCode() {
  return `DRV-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function generateSessionToken() {
  return crypto.randomBytes(24).toString("hex");
}

function readSession(req, store) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return null;
  }

  const session = store.sessions.find((item) => item.token === token);
  if (!session) {
    return null;
  }

  const student = store.students.find((item) => item.id === session.studentId);
  if (!student) {
    return null;
  }

  return { session, student };
}

function readTeacherSession(req, store) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return null;
  }

  const session = store.teacherSessions.find((item) => item.token === token);
  if (!session) {
    return null;
  }

  return { session };
}

function recordStudentActivity(student, activity) {
  ensureStudentTracking(student);
  student.lastActivityAt = activity.createdAt;
  student.activityLog.unshift(activity);
  student.activityLog = student.activityLog.slice(0, MAX_ACTIVITY_LOG_ITEMS);
}

function trackStudentLogin(student) {
  const now = new Date().toISOString();
  ensureStudentTracking(student);
  student.lastLoginAt = now;
  recordStudentActivity(student, {
    type: "login",
    createdAt: now,
    summary: "Системд нэвтэрсэн"
  });
}

function trackQuizOpen(student, group) {
  const now = new Date().toISOString();
  ensureStudentTracking(student);
  const chapter = student.chapterProgress[group.id] || {
    id: group.id,
    title: group.title,
    startedAt: now,
    lastOpenedAt: null,
    lastSubmittedAt: null,
    attempts: 0,
    bestScore: null,
    lastScore: null,
    totalQuestions: group.quizzes.length
  };

  chapter.title = group.title;
  chapter.totalQuestions = group.quizzes.length;
  chapter.lastOpenedAt = now;
  if (!chapter.startedAt) {
    chapter.startedAt = now;
  }

  student.chapterProgress[group.id] = chapter;
  recordStudentActivity(student, {
    type: "open_chapter",
    createdAt: now,
    summary: `${group.title} нээсэн`
  });
}

function trackQuizSubmission(student, group, score, total, results) {
  const now = new Date().toISOString();
  ensureStudentTracking(student);
  const chapter = student.chapterProgress[group.id] || {
    id: group.id,
    title: group.title,
    startedAt: now,
    lastOpenedAt: null,
    lastSubmittedAt: null,
    attempts: 0,
    bestScore: null,
    lastScore: null,
    totalQuestions: total,
    attemptHistory: []
  };

  chapter.title = group.title;
  chapter.totalQuestions = total;
  chapter.lastSubmittedAt = now;
  chapter.lastOpenedAt = chapter.lastOpenedAt || now;
  chapter.startedAt = chapter.startedAt || now;
  chapter.attempts = (chapter.attempts || 0) + 1;
  chapter.lastScore = score;
  chapter.bestScore = chapter.bestScore === null ? score : Math.max(chapter.bestScore, score);
  chapter.attemptHistory = Array.isArray(chapter.attemptHistory) ? chapter.attemptHistory : [];
  chapter.attemptHistory.unshift({
    createdAt: now,
    score,
    total,
    wrongCount: total - score,
    wrongQuestionIds: results.filter((item) => !item.correct).map((item) => item.id)
  });
  chapter.attemptHistory = chapter.attemptHistory.slice(0, 20);

  student.chapterProgress[group.id] = chapter;
  recordStudentActivity(student, {
    type: "submit_quiz",
    createdAt: now,
    summary: `${group.title} шалгаж ${score}/${total} авсан`
  });
}

function sanitizeStudent(student) {
  return {
    id: student.id,
    name: student.name,
    code: student.code,
    createdAt: student.createdAt,
    expiresAt: student.expiresAt,
    revokedAt: student.revokedAt || null,
    lastLoginAt: student.lastLoginAt || null,
    lastActivityAt: student.lastActivityAt || null
  };
}

function toTeacherStudentView(student, store) {
  const studentSessions = store.sessions
    .filter((session) => session.studentId === student.id)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const latestSession = studentSessions[0] || null;
  const chapterEntries = Object.values(student.chapterProgress || {}).sort((left, right) => {
    const leftTime = new Date(left.lastSubmittedAt || left.lastOpenedAt || left.startedAt || 0).getTime();
    const rightTime = new Date(right.lastSubmittedAt || right.lastOpenedAt || right.startedAt || 0).getTime();
    return rightTime - leftTime;
  });

  return {
    ...sanitizeStudent(student),
    lastLoginAt: student.lastLoginAt || (latestSession ? latestSession.createdAt : null),
    lastActivityAt: student.lastActivityAt || (latestSession ? latestSession.createdAt : null),
    activeSession: studentSessions.length > 0,
    chapters: chapterEntries.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      startedAt: chapter.startedAt || null,
      lastOpenedAt: chapter.lastOpenedAt || null,
      lastSubmittedAt: chapter.lastSubmittedAt || null,
      attempts: chapter.attempts || 0,
      bestScore: chapter.bestScore,
      lastScore: chapter.lastScore,
      totalQuestions: chapter.totalQuestions || 0,
      attemptHistory: Array.isArray(chapter.attemptHistory) ? chapter.attemptHistory : []
    })),
    recentActivity: (student.activityLog || []).slice(0, 5)
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (req.method === "GET" && (pathname === "/" || pathname === "/index.html")) {
    sendFile(res, path.join(PUBLIC_DIR, "index.html"));
    return;
  }

  if (req.method === "GET" && pathname === "/student") {
    sendFile(res, path.join(PUBLIC_DIR, "student.html"));
    return;
  }

  if (req.method === "GET" && pathname === "/teacher") {
    sendFile(res, path.join(PUBLIC_DIR, "teacher.html"));
    return;
  }

  if (req.method === "GET" && pathname === "/quiz") {
    sendFile(res, path.join(PUBLIC_DIR, "quiz.html"));
    return;
  }

  if (req.method === "GET" && pathname.startsWith("/public/")) {
    sendFile(res, path.join(__dirname, pathname));
    return;
  }

  const store = loadStore();
  pruneExpiredAccess(store);
  saveStore(store);

  if (req.method === "POST" && pathname === "/api/teacher/login") {
    try {
      const body = await parseRequestBody(req);
      if (body.password !== TEACHER_PASSWORD) {
        sendJson(res, 401, { error: "Нууц үг буруу байна." });
        return;
      }

      const token = generateSessionToken();
      store.teacherSessions.push({
        token,
        createdAt: new Date().toISOString()
      });
      saveStore(store);

      sendJson(res, 200, { success: true, token });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && pathname === "/api/teacher/students") {
    const teacherAuth = readTeacherSession(req, store);
    if (!teacherAuth) {
      sendJson(res, 401, { error: "Багш нэвтрээгүй байна." });
      return;
    }

    try {
      const body = await parseRequestBody(req);

      if (!body.name || String(body.name).trim().length < 2) {
        sendJson(res, 400, { error: "Сурагчийн нэр оруулна уу." });
        return;
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + ACCESS_DURATION_DAYS * 24 * 60 * 60 * 1000);
      const student = {
        id: crypto.randomUUID(),
        name: String(body.name).trim(),
        code: generateAccessCode(),
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        lastLoginAt: null,
        lastActivityAt: null,
        chapterProgress: {},
        activityLog: []
      };

      store.students.unshift(student);
      saveStore(store);

      sendJson(res, 201, { student: sanitizeStudent(student) });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && pathname === "/api/student/login") {
    try {
      const body = await parseRequestBody(req);
      const code = String(body.code || "").trim().toUpperCase();

      if (!code) {
        sendJson(res, 400, { error: "Special ID оруулна уу." });
        return;
      }

      const student = store.students.find((item) => item.code === code);
      if (!student) {
        sendJson(res, 404, { error: "ID олдсонгүй эсвэл хугацаа дууссан байна." });
        return;
      }
      if (student.revokedAt) {
        sendJson(res, 403, { error: "Энэ сурагчийн access багшаар цуцлагдсан байна." });
        return;
      }

      trackStudentLogin(student);
      const token = generateSessionToken();
      store.sessions = store.sessions.filter((item) => item.studentId !== student.id);
      store.sessions.push({
        token,
        studentId: student.id,
        createdAt: new Date().toISOString()
      });
      saveStore(store);

      sendJson(res, 200, {
        token,
        student: {
          name: student.name,
          expiresAt: student.expiresAt
        }
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  const revokeMatch =
    req.method === "POST" ? pathname.match(/^\/api\/teacher\/students\/([^/]+)\/revoke$/) : null;
  if (revokeMatch) {
    const teacherAuth = readTeacherSession(req, store);
    if (!teacherAuth) {
      sendJson(res, 401, { error: "Багш нэвтрээгүй байна." });
      return;
    }

    const studentId = decodeURIComponent(revokeMatch[1]);
    const student = store.students.find((item) => item.id === studentId);
    if (!student) {
      sendJson(res, 404, { error: "Сурагч олдсонгүй." });
      return;
    }

    if (!student.revokedAt) {
      const now = new Date().toISOString();
      student.revokedAt = now;
      recordStudentActivity(student, {
        type: "revoke_access",
        createdAt: now,
        summary: "Багш access-ийг цуцалсан"
      });
    }
    store.sessions = store.sessions.filter((session) => session.studentId !== student.id);
    saveStore(store);

    sendJson(res, 200, {
      success: true,
      student: sanitizeStudent(student)
    });
    return;
  }

  const deleteMatch =
    req.method === "DELETE" ? pathname.match(/^\/api\/teacher\/students\/([^/]+)$/) : null;
  if (deleteMatch) {
    const teacherAuth = readTeacherSession(req, store);
    if (!teacherAuth) {
      sendJson(res, 401, { error: "Багш нэвтрээгүй байна." });
      return;
    }

    const studentId = decodeURIComponent(deleteMatch[1]);
    const studentIndex = store.students.findIndex((item) => item.id === studentId);
    if (studentIndex === -1) {
      sendJson(res, 404, { error: "Сурагч олдсонгүй." });
      return;
    }

    const [removedStudent] = store.students.splice(studentIndex, 1);
    store.sessions = store.sessions.filter((session) => session.studentId !== removedStudent.id);
    saveStore(store);

    sendJson(res, 200, {
      success: true,
      removedStudentId: removedStudent.id
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/student/me") {
    const auth = readSession(req, store);
    if (!auth) {
      sendJson(res, 401, { error: "Нэвтрээгүй байна." });
      return;
    }

    sendJson(res, 200, {
      student: {
        name: auth.student.name,
        expiresAt: auth.student.expiresAt
      }
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/quiz-groups") {
    const auth = readSession(req, store);
    if (!auth) {
      sendJson(res, 401, { error: "Нэвтрээгүй байна." });
      return;
    }

    sendJson(res, 200, {
      groups: quizGroups.map((group) => ({
        id: group.id,
        title: group.title,
        description: group.description,
        quizCount: group.quizzes.length,
        available: group.quizzes.length > 0
      }))
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/quizzes") {
    const auth = readSession(req, store);
    if (!auth) {
      sendJson(res, 401, { error: "Тест үзэхийн тулд нэвтэрнэ үү." });
      return;
    }

    const requestedGroupId = url.searchParams.get("group");
    const activeGroup = getQuizGroup(requestedGroupId);
    const publicQuizzes = activeGroup.quizzes.map(toPublicQuiz);
    trackQuizOpen(auth.student, activeGroup);
    saveStore(store);

    sendJson(res, 200, {
      groups: quizGroups.map((group) => ({
        id: group.id,
        title: group.title,
        description: group.description,
        quizCount: group.quizzes.length,
        available: group.quizzes.length > 0
      })),
      activeGroup: {
        id: activeGroup.id,
        title: activeGroup.title,
        description: activeGroup.description,
        quizCount: activeGroup.quizzes.length
      },
      quizzes: publicQuizzes
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/quizzes/submit") {
    const auth = readSession(req, store);
    if (!auth) {
      sendJson(res, 401, { error: "Тест шалгуулахын тулд нэвтэрнэ үү." });
      return;
    }

    try {
      const body = await parseRequestBody(req);
      const activeGroup = getQuizGroup(body.groupId);
      const answers = Array.isArray(body.answers) ? body.answers : [];

      let score = 0;
      const results = activeGroup.quizzes.map((quiz) => {
        const submitted = answers.find((answer) => answer.id === quiz.id);
        const selected = submitted ? submitted.selected : null;
        const correct = selected === quiz.answer;
        if (correct) {
          score += 1;
        }
        return {
          id: quiz.id,
          correct,
          selected,
          answer: quiz.answer,
          explanation: quiz.explanation || "",
          answerText: quiz.options[quiz.answer] || ""
        };
      });

      trackQuizSubmission(auth.student, activeGroup, score, activeGroup.quizzes.length, results);
      saveStore(store);

      sendJson(res, 200, {
        total: activeGroup.quizzes.length,
        score,
        group: {
          id: activeGroup.id,
          title: activeGroup.title
        },
        results
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "GET" && pathname === "/api/teacher/me") {
    const teacherAuth = readTeacherSession(req, store);
    if (!teacherAuth) {
      sendJson(res, 401, { error: "Багш нэвтрээгүй байна." });
      return;
    }

    sendJson(res, 200, {
      teacher: {
        loggedIn: true
      }
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/teacher/dashboard") {
    const teacherAuth = readTeacherSession(req, store);
    if (!teacherAuth) {
      sendJson(res, 401, { error: "Багш нэвтрээгүй байна." });
      return;
    }

    const students = store.students.map((student) => toTeacherStudentView(student, store));
    sendJson(res, 200, {
      stats: {
        studentCount: students.length,
        activeSessionCount: students.filter((student) => student.activeSession).length,
        activeChapterCount: students.reduce((sum, student) => sum + student.chapters.length, 0)
      },
      students
    });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  ensureStorage();
  console.log(`Driving test app is running on http://localhost:${PORT}`);
});

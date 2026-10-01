/**
 * Deterministic demo data for NetGrow. Wipes all content tables and reinserts
 * a fixed synthetic dataset so the app behaves identically after every reset.
 * All names, projects and metrics are invented for this academic demo and do
 * not reference any real organization or person.
 */
import { getDb } from "../src/lib/db/client";

type Row = Record<string, unknown>;

function run() {
  const db = getDb();

  db.exec("PRAGMA foreign_keys = OFF");
  const wipeOrder = [
    "activity_log",
    "events",
    "tasks",
    "team_members",
    "teams",
    "applications",
    "project_competencies",
    "projects",
    "user_competencies",
    "competencies",
    "users",
    "shifts",
  ];
  for (const table of wipeOrder) {
    db.exec(`DELETE FROM ${table}`);
  }
  db.exec("PRAGMA foreign_keys = ON");

  db.exec(
    `INSERT OR IGNORE INTO roles (code, name) VALUES
     ('participant', 'Участник'),
     ('organizer', 'Организатор'),
     ('admin', 'Администратор')`
  );
  const roleIdByCode = new Map(
    (db.prepare("SELECT id, code FROM roles").all() as { id: number; code: string }[]).map(
      (r) => [r.code, r.id]
    )
  );

  const insert = (table: string, row: Row) => {
    const cols = Object.keys(row);
    const placeholders = cols.map((c) => `@${c}`).join(", ");
    db.prepare(`INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`).run(row);
  };

  // --- Shifts -------------------------------------------------------------
  insert("shifts", {
    id: "shift-vector",
    name: "Смена «Вектор»",
    code: "VECTOR-2026",
    start_date: "2026-08-25",
    end_date: "2026-09-15",
    status: "active",
    created_at: "2026-08-01T09:00:00.000Z",
  });
  insert("shifts", {
    id: "shift-horizon",
    name: "Смена «Горизонт»",
    code: "HORIZON-2026",
    start_date: "2026-10-01",
    end_date: "2026-10-21",
    status: "planned",
    created_at: "2026-08-20T09:00:00.000Z",
  });

  // --- Competencies ---------------------------------------------------------
  const competencies: { id: string; name: string; category: string; description: string }[] = [
    { id: "comp-vocal", name: "Вокал", category: "Творчество", description: "Сольное и хоровое пение" },
    { id: "comp-dance", name: "Хореография", category: "Творчество", description: "Постановка танцевальных номеров" },
    { id: "comp-acting", name: "Актёрское мастерство", category: "Творчество", description: "Сценическая речь и импровизация" },
    { id: "comp-stage", name: "Сценография", category: "Творчество", description: "Оформление сцены и реквизит" },
    { id: "comp-robotics", name: "Робототехника", category: "Технологии", description: "Сборка и программирование роботов" },
    { id: "comp-programming", name: "Программирование", category: "Технологии", description: "Базовое и прикладное программирование" },
    { id: "comp-video", name: "Видеомонтаж", category: "Технологии", description: "Съёмка и монтаж видеороликов" },
    { id: "comp-photo", name: "Фотография", category: "Технологии", description: "Фотосъёмка мероприятий" },
    { id: "comp-speaking", name: "Публичные выступления", category: "Коммуникации", description: "Ведение и презентации" },
    { id: "comp-moderation", name: "Модерация мероприятий", category: "Коммуникации", description: "Организация и ведение событий" },
    { id: "comp-journalism", name: "Журналистика", category: "Коммуникации", description: "Подготовка текстов и интервью" },
    { id: "comp-orienteering", name: "Туризм и ориентирование", category: "Спорт и активность", description: "Навыки ориентирования на местности" },
    { id: "comp-sport-org", name: "Организация спортивных игр", category: "Спорт и активность", description: "Проведение эстафет и турниров" },
    { id: "comp-teamwork", name: "Командная работа", category: "Лидерство", description: "Эффективное взаимодействие в команде" },
    { id: "comp-project-mgmt", name: "Управление проектами", category: "Лидерство", description: "Планирование и контроль задач" },
    { id: "comp-ecology", name: "Экологическая грамотность", category: "Экология", description: "Основы устойчивого природопользования" },
  ];
  for (const c of competencies) {
    insert("competencies", { ...c, created_at: "2026-08-01T09:00:00.000Z" });
  }

  // --- Users ----------------------------------------------------------------
  const admin = {
    id: "user-admin",
    full_name: "Виктор Наумов",
    email: "admin@druzhba.demo",
    role_id: roleIdByCode.get("admin"),
    shift_id: null,
    age_group: null,
    bio: "Администратор информационной системы лагеря.",
    avatar_color: "#4B5563",
  };
  insert("users", { ...admin, created_at: "2026-07-15T09:00:00.000Z" });

  const organizers = [
    {
      id: "user-organizer-kovaleva",
      full_name: "Ирина Ковалёва",
      email: "irina.kovaleva@druzhba.demo",
      role_id: roleIdByCode.get("organizer"),
      shift_id: "shift-vector",
      age_group: null,
      bio: "Куратор проектной деятельности смены «Вектор».",
      avatar_color: "#0F766E",
    },
    {
      id: "user-organizer-orlov",
      full_name: "Дмитрий Орлов",
      email: "dmitry.orlov@druzhba.demo",
      role_id: roleIdByCode.get("organizer"),
      shift_id: "shift-vector",
      age_group: null,
      bio: "Куратор творческих и медийных проектов.",
      avatar_color: "#7C3AED",
    },
  ];
  for (const o of organizers) insert("users", { ...o, created_at: "2026-07-20T09:00:00.000Z" });

  interface ParticipantSeed {
    id: string;
    full_name: string;
    email: string;
    age_group: "9-11" | "12-14" | "15-17";
    bio: string;
    competencies: { id: string; level: number }[];
  }

  const participants: ParticipantSeed[] = [
    {
      id: "user-sokolova",
      full_name: "Мария Соколова",
      email: "maria.sokolova@druzhba.demo",
      age_group: "12-14",
      bio: "Люблю писать заметки в лагерную газету и фотографировать.",
      competencies: [
        { id: "comp-journalism", level: 3 },
        { id: "comp-photo", level: 2 },
        { id: "comp-teamwork", level: 4 },
      ],
    },
    {
      id: "user-petrov",
      full_name: "Артём Петров",
      email: "artem.petrov@druzhba.demo",
      age_group: "12-14",
      bio: "Занимаюсь видеомонтажом второй год.",
      competencies: [
        { id: "comp-video", level: 4 },
        { id: "comp-programming", level: 2 },
        { id: "comp-teamwork", level: 3 },
      ],
    },
    {
      id: "user-ivanova",
      full_name: "Дарья Иванова",
      email: "darya.ivanova@druzhba.demo",
      age_group: "9-11",
      bio: "Пою в школьном хоре, хочу выступить на сцене лагеря.",
      competencies: [
        { id: "comp-vocal", level: 3 },
        { id: "comp-acting", level: 2 },
      ],
    },
    {
      id: "user-smirnov",
      full_name: "Егор Смирнов",
      email: "egor.smirnov@druzhba.demo",
      age_group: "15-17",
      bio: "Собираю роботов из конструктора, участвовал в олимпиадах.",
      competencies: [
        { id: "comp-robotics", level: 4 },
        { id: "comp-programming", level: 4 },
        { id: "comp-project-mgmt", level: 3 },
      ],
    },
    {
      id: "user-kuznetsova",
      full_name: "Полина Кузнецова",
      email: "polina.kuznetsova@druzhba.demo",
      age_group: "12-14",
      bio: "Веду утреннюю зарядку и люблю организовывать игры.",
      competencies: [
        { id: "comp-sport-org", level: 4 },
        { id: "comp-moderation", level: 3 },
        { id: "comp-teamwork", level: 3 },
      ],
    },
    {
      id: "user-vasilev",
      full_name: "Никита Васильев",
      email: "nikita.vasilev@druzhba.demo",
      age_group: "15-17",
      bio: "Интересуюсь экологией и туризмом.",
      competencies: [
        { id: "comp-ecology", level: 4 },
        { id: "comp-orienteering", level: 3 },
        { id: "comp-teamwork", level: 3 },
      ],
    },
    {
      id: "user-fedorova",
      full_name: "Алина Фёдорова",
      email: "alina.fedorova@druzhba.demo",
      age_group: "9-11",
      bio: "Рисую декорации и делаю афиши для мероприятий.",
      competencies: [
        { id: "comp-stage", level: 3 },
        { id: "comp-acting", level: 2 },
      ],
    },
    {
      id: "user-morozov",
      full_name: "Илья Морозов",
      email: "ilya.morozov@druzhba.demo",
      age_group: "15-17",
      bio: "Играю на гитаре и веду вечерние сборы отряда.",
      competencies: [
        { id: "comp-vocal", level: 3 },
        { id: "comp-speaking", level: 4 },
        { id: "comp-moderation", level: 3 },
      ],
    },
    {
      id: "user-belova",
      full_name: "Ксения Белова",
      email: "kseniya.belova@druzhba.demo",
      age_group: "12-14",
      bio: "Снимаю ролики о жизни отряда на телефон.",
      competencies: [
        { id: "comp-video", level: 3 },
        { id: "comp-photo", level: 3 },
        { id: "comp-journalism", level: 2 },
      ],
    },
    {
      id: "user-volkov",
      full_name: "Максим Волков",
      email: "maxim.volkov@druzhba.demo",
      age_group: "12-14",
      bio: "Быстро учусь новому и люблю технику.",
      competencies: [
        { id: "comp-robotics", level: 2 },
        { id: "comp-programming", level: 3 },
      ],
    },
    {
      id: "user-nikitina",
      full_name: "Софья Никитина",
      email: "sofya.nikitina@druzhba.demo",
      age_group: "9-11",
      bio: "Хочу танцевать на открытии смены.",
      competencies: [
        { id: "comp-dance", level: 3 },
        { id: "comp-acting", level: 2 },
      ],
    },
    {
      id: "user-zaitsev",
      full_name: "Роман Зайцев",
      email: "roman.zaitsev@druzhba.demo",
      age_group: "15-17",
      bio: "Отвечаю за спортивный инвентарь в отряде.",
      competencies: [
        { id: "comp-sport-org", level: 3 },
        { id: "comp-orienteering", level: 2 },
        { id: "comp-teamwork", level: 4 },
      ],
    },
  ];

  for (const p of participants) {
    insert("users", {
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      role_id: roleIdByCode.get("participant"),
      shift_id: "shift-vector",
      age_group: p.age_group,
      bio: p.bio,
      avatar_color: "#2F6F5E",
      created_at: "2026-08-10T09:00:00.000Z",
    });
    for (const c of p.competencies) {
      insert("user_competencies", {
        id: `ucomp-${p.id}-${c.id}`,
        user_id: p.id,
        competency_id: c.id,
        level: c.level,
        created_at: "2026-08-10T09:00:00.000Z",
      });
    }
  }

  // --- Projects ---------------------------------------------------------
  insert("projects", {
    id: "proj-media-center",
    title: "Летний медиацентр",
    description:
      "Команда снимает и монтирует ежедневные видеоновости о жизни смены, ведёт фотохронику мероприятий.",
    direction: "Медиа и журналистика",
    age_group: "12-14",
    status: "in_progress",
    shift_id: "shift-vector",
    organizer_id: "user-organizer-kovaleva",
    capacity: 6,
    created_at: "2026-08-02T10:00:00.000Z",
    updated_at: "2026-08-26T10:00:00.000Z",
  });
  insert("projects", {
    id: "proj-eco-quest",
    title: "Экологический квест",
    description:
      "Разработка и проведение квеста по экологической грамотности для младших отрядов: маршрут, задания, реквизит.",
    direction: "Экология",
    age_group: "any",
    status: "recruiting",
    shift_id: "shift-vector",
    organizer_id: "user-organizer-kovaleva",
    capacity: 6,
    created_at: "2026-08-27T10:00:00.000Z",
    updated_at: "2026-08-27T10:00:00.000Z",
  });
  insert("projects", {
    id: "proj-opening-concert",
    title: "Творческий вечер: открытие смены",
    description: "Концертная программа на открытие смены: номера, ведущие, оформление сцены.",
    direction: "Творчество",
    age_group: "any",
    status: "completed",
    shift_id: "shift-vector",
    organizer_id: "user-organizer-orlov",
    capacity: 10,
    created_at: "2026-08-01T10:00:00.000Z",
    updated_at: "2026-08-25T20:00:00.000Z",
  });
  insert("projects", {
    id: "proj-robotics",
    title: "Робо-мастерская",
    description: "Сборка простых роботов и подготовка мини-соревнования между отрядами.",
    direction: "Технологии",
    age_group: "12-14",
    status: "recruiting",
    shift_id: "shift-vector",
    organizer_id: "user-organizer-orlov",
    capacity: 5,
    created_at: "2026-08-28T10:00:00.000Z",
    updated_at: "2026-08-28T10:00:00.000Z",
  });
  insert("projects", {
    id: "proj-sport-fest",
    title: "Спортивный фестиваль «Дружба»",
    description: "Организация межотрядных эстафет и турниров в течение смены.",
    direction: "Спорт",
    age_group: "any",
    status: "in_progress",
    shift_id: "shift-vector",
    organizer_id: "user-organizer-kovaleva",
    capacity: 8,
    created_at: "2026-08-03T10:00:00.000Z",
    updated_at: "2026-08-29T10:00:00.000Z",
  });
  insert("projects", {
    id: "proj-camp-newspaper",
    title: "Лагерная газета",
    description: "Еженедельный выпуск печатной газеты смены с заметками и интервью.",
    direction: "Медиа и журналистика",
    age_group: "9-11",
    status: "draft",
    shift_id: "shift-vector",
    organizer_id: "user-organizer-orlov",
    capacity: 6,
    created_at: "2026-09-01T10:00:00.000Z",
    updated_at: "2026-09-01T10:00:00.000Z",
  });
  insert("projects", {
    id: "proj-photo-project",
    title: "Фотопроект «Один день смены»",
    description: "Фотоальбом одного дня смены, собранный участниками из разных отрядов.",
    direction: "Медиа и журналистика",
    age_group: "15-17",
    status: "archived",
    shift_id: "shift-vector",
    organizer_id: "user-organizer-kovaleva",
    capacity: 5,
    created_at: "2026-07-25T10:00:00.000Z",
    updated_at: "2026-08-05T10:00:00.000Z",
  });

  const projectCompetencies: [string, string, number][] = [
    ["proj-media-center", "comp-video", 2],
    ["proj-media-center", "comp-photo", 2],
    ["proj-media-center", "comp-journalism", 2],
    ["proj-eco-quest", "comp-ecology", 2],
    ["proj-eco-quest", "comp-teamwork", 2],
    ["proj-opening-concert", "comp-vocal", 2],
    ["proj-opening-concert", "comp-acting", 2],
    ["proj-opening-concert", "comp-stage", 2],
    ["proj-robotics", "comp-robotics", 2],
    ["proj-robotics", "comp-programming", 2],
    ["proj-sport-fest", "comp-sport-org", 2],
    ["proj-sport-fest", "comp-teamwork", 2],
    ["proj-camp-newspaper", "comp-journalism", 1],
    ["proj-photo-project", "comp-photo", 2],
  ];
  for (const [projectId, competencyId, minLevel] of projectCompetencies) {
    insert("project_competencies", {
      id: `pcomp-${projectId}-${competencyId}`,
      project_id: projectId,
      competency_id: competencyId,
      min_level: minLevel,
    });
  }

  // --- Applications, teams, tasks -----------------------------------------
  function seedTeamProject(opts: {
    projectId: string;
    teamId: string;
    teamName: string;
    members: { userId: string; role: "lead" | "member" }[];
    organizerId: string;
    appliedAt: string;
  }) {
    insert("teams", {
      id: opts.teamId,
      project_id: opts.projectId,
      name: opts.teamName,
      created_at: opts.appliedAt,
    });
    for (const m of opts.members) {
      insert("applications", {
        id: `app-${opts.projectId}-${m.userId}`,
        project_id: opts.projectId,
        applicant_id: m.userId,
        status: "approved",
        message: "Хочу принять участие в проекте.",
        decision_note: "Подходит по компетенциям.",
        decided_by: opts.organizerId,
        decided_at: opts.appliedAt,
        created_at: opts.appliedAt,
      });
      insert("team_members", {
        id: `tmem-${opts.teamId}-${m.userId}`,
        team_id: opts.teamId,
        user_id: m.userId,
        role_in_team: m.role,
        joined_at: opts.appliedAt,
      });
    }
  }

  seedTeamProject({
    projectId: "proj-media-center",
    teamId: "team-media-center",
    teamName: "Команда «Летний медиацентр»",
    organizerId: "user-organizer-kovaleva",
    appliedAt: "2026-08-03T12:00:00.000Z",
    members: [
      { userId: "user-petrov", role: "lead" },
      { userId: "user-belova", role: "member" },
      { userId: "user-morozov", role: "member" },
    ],
  });

  seedTeamProject({
    projectId: "proj-opening-concert",
    teamId: "team-opening-concert",
    teamName: "Команда «Открытие смены»",
    organizerId: "user-organizer-orlov",
    appliedAt: "2026-08-02T12:00:00.000Z",
    members: [
      { userId: "user-ivanova", role: "lead" },
      { userId: "user-fedorova", role: "member" },
      { userId: "user-nikitina", role: "member" },
    ],
  });

  seedTeamProject({
    projectId: "proj-sport-fest",
    teamId: "team-sport-fest",
    teamName: "Команда «Спортивный фестиваль»",
    organizerId: "user-organizer-kovaleva",
    appliedAt: "2026-08-04T12:00:00.000Z",
    members: [
      { userId: "user-kuznetsova", role: "lead" },
      { userId: "user-zaitsev", role: "member" },
    ],
  });

  seedTeamProject({
    projectId: "proj-photo-project",
    teamId: "team-photo-project",
    teamName: "Команда «Фотопроект»",
    organizerId: "user-organizer-kovaleva",
    appliedAt: "2026-07-26T12:00:00.000Z",
    members: [{ userId: "user-belova", role: "lead" }],
  });

  // Pending / decided applications for the recruiting queue demo.
  insert("applications", {
    id: "app-eco-quest-vasilev",
    project_id: "proj-eco-quest",
    applicant_id: "user-vasilev",
    status: "pending",
    message: "Занимаюсь туризмом и ориентированием, хочу помочь с маршрутом квеста.",
    decision_note: "",
    decided_by: null,
    decided_at: null,
    created_at: "2026-08-28T09:00:00.000Z",
  });
  insert("applications", {
    id: "app-eco-quest-volkov",
    project_id: "proj-eco-quest",
    applicant_id: "user-volkov",
    status: "pending",
    message: "Интересно попробовать себя в новом направлении.",
    decision_note: "",
    decided_by: null,
    decided_at: null,
    created_at: "2026-08-29T09:00:00.000Z",
  });
  insert("applications", {
    id: "app-eco-quest-nikitina",
    project_id: "proj-eco-quest",
    applicant_id: "user-nikitina",
    status: "rejected",
    message: "Хочу поучаствовать, хотя опыта в экологии нет.",
    decision_note: "Набор закрыт по хореографическому направлению, приглашаем в другой проект.",
    decided_by: "user-organizer-kovaleva",
    decided_at: "2026-08-29T10:00:00.000Z",
    created_at: "2026-08-28T15:00:00.000Z",
  });
  insert("applications", {
    id: "app-robotics-volkov",
    project_id: "proj-robotics",
    applicant_id: "user-volkov",
    status: "pending",
    message: "Уже собирал конструкторы дома, хочу развивать навык.",
    decision_note: "",
    decided_by: null,
    decided_at: null,
    created_at: "2026-08-29T11:00:00.000Z",
  });

  // Tasks for formed teams.
  const tasks: {
    id: string;
    team_id: string;
    title: string;
    description: string;
    assignee_id: string | null;
    status: "todo" | "in_progress" | "done";
    due_date: string | null;
    created_by: string;
    created_at: string;
  }[] = [
    {
      id: "task-media-1",
      team_id: "team-media-center",
      title: "Смонтировать ролик о дне заезда",
      description: "Собрать видео из отснятых кадров первого дня смены.",
      assignee_id: "user-petrov",
      status: "done",
      due_date: "2026-08-27",
      created_by: "user-organizer-kovaleva",
      created_at: "2026-08-25T09:00:00.000Z",
    },
    {
      id: "task-media-2",
      team_id: "team-media-center",
      title: "Сделать фоторепортаж со спортивного дня",
      description: "Не менее 20 фотографий с подписями для стенда.",
      assignee_id: "user-belova",
      status: "in_progress",
      due_date: "2026-09-05",
      created_by: "user-organizer-kovaleva",
      created_at: "2026-08-30T09:00:00.000Z",
    },
    {
      id: "task-media-3",
      team_id: "team-media-center",
      title: "Взять интервью у капитанов отрядов",
      description: "3-4 коротких интервью для итогового ролика смены.",
      assignee_id: "user-morozov",
      status: "todo",
      due_date: "2026-09-10",
      created_by: "user-organizer-kovaleva",
      created_at: "2026-09-01T09:00:00.000Z",
    },
    {
      id: "task-media-4",
      team_id: "team-media-center",
      title: "Составить план публикаций на неделю",
      description: "",
      assignee_id: null,
      status: "todo",
      due_date: null,
      created_by: "user-organizer-kovaleva",
      created_at: "2026-09-02T09:00:00.000Z",
    },
    {
      id: "task-sport-1",
      team_id: "team-sport-fest",
      title: "Подготовить инвентарь для эстафеты",
      description: "Проверить и разложить инвентарь по станциям.",
      assignee_id: "user-zaitsev",
      status: "in_progress",
      due_date: "2026-09-06",
      created_by: "user-organizer-kovaleva",
      created_at: "2026-08-30T09:00:00.000Z",
    },
    {
      id: "task-sport-2",
      team_id: "team-sport-fest",
      title: "Составить сетку турнира",
      description: "Расписание игр между отрядами.",
      assignee_id: "user-kuznetsova",
      status: "done",
      due_date: "2026-08-31",
      created_by: "user-organizer-kovaleva",
      created_at: "2026-08-28T09:00:00.000Z",
    },
    {
      id: "task-opening-1",
      team_id: "team-opening-concert",
      title: "Прогнать номера на генеральной репетиции",
      description: "",
      assignee_id: "user-ivanova",
      status: "done",
      due_date: "2026-08-24",
      created_by: "user-organizer-orlov",
      created_at: "2026-08-20T09:00:00.000Z",
    },
    {
      id: "task-photo-1",
      team_id: "team-photo-project",
      title: "Собрать финальный альбом",
      description: "Отобрать 40 лучших кадров и оформить альбом.",
      assignee_id: "user-belova",
      status: "done",
      due_date: "2026-08-05",
      created_by: "user-organizer-kovaleva",
      created_at: "2026-07-28T09:00:00.000Z",
    },
  ];
  for (const t of tasks) {
    insert("tasks", { ...t, updated_at: t.created_at });
  }

  // --- Events ---------------------------------------------------------------
  const events: {
    id: string;
    shift_id: string;
    team_id: string | null;
    title: string;
    description: string;
    event_type: string;
    starts_at: string;
    ends_at: string;
    location: string;
    created_by: string;
  }[] = [
    {
      id: "evt-opening",
      shift_id: "shift-vector",
      team_id: null,
      title: "Открытие смены",
      description: "Общий сбор и концертная программа.",
      event_type: "performance",
      starts_at: "2026-08-25T19:00:00.000Z",
      ends_at: "2026-08-25T21:00:00.000Z",
      location: "Летняя эстрада",
      created_by: "user-organizer-orlov",
    },
    {
      id: "evt-general-meeting",
      shift_id: "shift-vector",
      team_id: null,
      title: "Общий сбор вожатых и организаторов",
      description: "Обсуждение плана мероприятий недели.",
      event_type: "meeting",
      starts_at: "2026-09-08T08:30:00.000Z",
      ends_at: "2026-09-08T09:00:00.000Z",
      location: "Актовый зал",
      created_by: "user-organizer-kovaleva",
    },
    {
      id: "evt-media-training",
      shift_id: "shift-vector",
      team_id: "team-media-center",
      title: "Обучение видеомонтажу",
      description: "Разбор приёмов монтажа для новых участников команды.",
      event_type: "training",
      starts_at: "2026-09-09T11:00:00.000Z",
      ends_at: "2026-09-09T12:30:00.000Z",
      location: "Медиастудия",
      created_by: "user-organizer-kovaleva",
    },
    {
      id: "evt-sport-rehearsal",
      shift_id: "shift-vector",
      team_id: "team-sport-fest",
      title: "Разметка площадки к фестивалю",
      description: "Подготовка стадиона к спортивному фестивалю.",
      event_type: "rehearsal",
      starts_at: "2026-09-10T10:00:00.000Z",
      ends_at: "2026-09-10T11:30:00.000Z",
      location: "Стадион",
      created_by: "user-organizer-kovaleva",
    },
    {
      id: "evt-sport-fest-day",
      shift_id: "shift-vector",
      team_id: "team-sport-fest",
      title: "Спортивный фестиваль «Дружба»",
      description: "Финальный день турниров между отрядами.",
      event_type: "performance",
      starts_at: "2026-09-12T15:00:00.000Z",
      ends_at: "2026-09-12T18:00:00.000Z",
      location: "Стадион",
      created_by: "user-organizer-kovaleva",
    },
    {
      id: "evt-closing",
      shift_id: "shift-vector",
      team_id: null,
      title: "Закрытие смены",
      description: "Итоговый концерт и награждение.",
      event_type: "performance",
      starts_at: "2026-09-14T19:00:00.000Z",
      ends_at: "2026-09-14T21:00:00.000Z",
      location: "Летняя эстрада",
      created_by: "user-organizer-orlov",
    },
  ];
  for (const e of events) {
    insert("events", { ...e, created_at: "2026-08-15T09:00:00.000Z" });
  }

  // --- Activity log (historical) --------------------------------------------
  const logs: { id: string; actor_id: string | null; action: string; entity_type: string; entity_id: string; metadata: string; created_at: string }[] = [
    {
      id: "log-1",
      actor_id: "user-organizer-kovaleva",
      action: "project.created",
      entity_type: "project",
      entity_id: "proj-media-center",
      metadata: JSON.stringify({ title: "Летний медиацентр" }),
      created_at: "2026-08-02T10:00:00.000Z",
    },
    {
      id: "log-2",
      actor_id: "user-organizer-kovaleva",
      action: "application.approved",
      entity_type: "application",
      entity_id: "app-proj-media-center-user-petrov",
      metadata: JSON.stringify({ project: "proj-media-center", applicant: "user-petrov" }),
      created_at: "2026-08-03T12:00:00.000Z",
    },
    {
      id: "log-3",
      actor_id: "user-organizer-kovaleva",
      action: "application.rejected",
      entity_type: "application",
      entity_id: "app-eco-quest-nikitina",
      metadata: JSON.stringify({ project: "proj-eco-quest", applicant: "user-nikitina" }),
      created_at: "2026-08-29T10:00:00.000Z",
    },
    {
      id: "log-4",
      actor_id: "user-organizer-kovaleva",
      action: "task.created",
      entity_type: "task",
      entity_id: "task-media-3",
      metadata: JSON.stringify({ title: "Взять интервью у капитанов отрядов" }),
      created_at: "2026-09-01T09:00:00.000Z",
    },
  ];
  for (const l of logs) insert("activity_log", l);

  console.log("Демо-данные загружены:");
  console.log(`  Смены: ${db.prepare("SELECT COUNT(*) c FROM shifts").get()}`);
  console.log(`  Пользователи: ${JSON.stringify(db.prepare("SELECT COUNT(*) c FROM users").get())}`);
  console.log(`  Компетенции: ${JSON.stringify(db.prepare("SELECT COUNT(*) c FROM competencies").get())}`);
  console.log(`  Проекты: ${JSON.stringify(db.prepare("SELECT COUNT(*) c FROM projects").get())}`);
  console.log(`  Заявки: ${JSON.stringify(db.prepare("SELECT COUNT(*) c FROM applications").get())}`);
  console.log(`  Команды: ${JSON.stringify(db.prepare("SELECT COUNT(*) c FROM teams").get())}`);
  console.log(`  Задачи: ${JSON.stringify(db.prepare("SELECT COUNT(*) c FROM tasks").get())}`);
  console.log(`  События: ${JSON.stringify(db.prepare("SELECT COUNT(*) c FROM events").get())}`);
  console.log("");
  console.log("Демо-аккаунты для входа:");
  console.log("  Участник:    maria.sokolova@druzhba.demo (Мария Соколова)");
  console.log("  Организатор: irina.kovaleva@druzhba.demo (Ирина Ковалёва)");
  console.log("  Администратор: admin@druzhba.demo (Виктор Наумов)");
}

run();

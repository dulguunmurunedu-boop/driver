# Driving Test App

Жолооны курсын тестийн web app.

Үндсэн боломжууд:
- Багш нууц үгээрээ нэвтэрч dashboard-оос бүх сурагчийг хянана
- `Special ID` үүсгэж сурагчид 30 хоногийн access нээнэ
- Сурагч chapter-уудаар тест бөглөнө
- Access хугацаа дуусмагц автоматаар хаагдана
- Багш сурагчийн access цуцлах, устгах боломжтой

## Local ажиллуулах

```bash
npm start
```

Browser:

```text
http://localhost:3030
```

## Default teacher password

```text
teacher123
```

Солих бол:

```bash
TEACHER_PASSWORD=my-secret-password npm start
```

Өөр port хэрэгтэй бол:

```bash
PORT=3050 npm start
```

## Public URL болгох хамгийн зөв хувилбар

Энэ app нь өгөгдлөө файлд хадгалдаг тул `persistent disk`-тэй hosting хэрэгтэй.

Энэ repo дотор Render-д зориулсан [render.yaml](/Users/dudubn/Documents/New project 2/render.yaml) бэлэн байгаа.

### Render дээр deploy хийх алхам

1. GitHub дээр шинэ private repository үүсгэ.
2. Энэ төслийг GitHub руу push хий.
3. [Render Dashboard](https://dashboard.render.com/) руу ор.
4. `New` → `Blueprint` сонго.
5. GitHub repo-оо холбо.
6. Render `render.yaml`-ийг автоматаар уншаад web service + disk үүсгэнэ.
7. `TEACHER_PASSWORD` environment variable дээр өөрийн жинхэнэ нууц үгийг оруул.
8. Deploy хий.
9. Deploy дуусмагц Render танд `https://...onrender.com` public URL өгнө.

## Render дээр гараар хийх хувилбар

Хэрэв Blueprint биш гараар хийх бол:

1. `New` → `Web Service`
2. Repo-оо сонго
3. Дараах утгуудыг өг:

```text
Runtime: Node
Build Command: npm install
Start Command: npm start
```

4. Environment Variables:

```text
TEACHER_PASSWORD=өөрийн-нууц-үг
DATA_DIR=/opt/render/project/src/data
```

5. `Disks` хэсэгт persistent disk нэм:

```text
Mount Path: /opt/render/project/src/data
Size: 1 GB
```

6. Deploy хий.

## Маш чухал анхаарах зүйл

- `data/store.json`-ийг public repo руу push хийхгүй байх нь зөв. Тиймээс `.gitignore`-д оруулсан.
- Render дээр disk залгахгүй бол сурагчийн ID, progress, activity бүгд deploy/restart хийхэд устна.
- Public болгосны дараа багшийн нууц үгийг заавал соль.

## GitHub руу push хийх жишээ

```bash
git init
git add .
git commit -m "Initial deploy-ready version"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

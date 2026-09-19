CREATE TYPE "CategoryType" AS ENUM ('blog', 'faq');

CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_name_type_key" ON "Category"("name", "type");

INSERT INTO "Category" ("id", "name", "type", "updatedAt")
SELECT md5('blog:' || "category"), "category", 'blog'::"CategoryType", CURRENT_TIMESTAMP
FROM "Blog"
WHERE "category" IS NOT NULL AND "category" <> ''
ON CONFLICT ("name", "type") DO NOTHING;

INSERT INTO "Category" ("id", "name", "type", "updatedAt")
SELECT md5('faq:' || "category"), "category", 'faq'::"CategoryType", CURRENT_TIMESTAMP
FROM "Faq"
WHERE "category" IS NOT NULL AND "category" <> ''
ON CONFLICT ("name", "type") DO NOTHING;
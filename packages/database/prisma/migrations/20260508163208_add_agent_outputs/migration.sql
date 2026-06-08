-- AlterTable
ALTER TABLE "Scan" ADD COLUMN     "architectureDiagram" TEXT,
ADD COLUMN     "cicdDockerfile" TEXT,
ADD COLUMN     "cicdYaml" TEXT,
ADD COLUMN     "debugReport" TEXT,
ADD COLUMN     "repoProfile" TEXT;

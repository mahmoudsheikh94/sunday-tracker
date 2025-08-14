-- CreateTable
CREATE TABLE "public"."Playlist" (
    "id" TEXT NOT NULL,
    "spotifyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerName" TEXT,
    "imageUrl" TEXT,
    "snapshotId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Playlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlaylistTrack" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "spotifyId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "artistIds" TEXT[],
    "trackName" TEXT,
    "artistNames" TEXT,

    CONSTRAINT "PlaylistTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TrackingLink" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TrackingLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Click" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "clickId" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "utms" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Click_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SpotifyUser" (
    "id" TEXT NOT NULL,
    "spotifyUserId" TEXT NOT NULL,
    "email" TEXT,
    "country" TEXT,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpotifyUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OAuthToken" (
    "id" TEXT NOT NULL,
    "spotifyUserId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserConnection" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "spotifyUserId" TEXT NOT NULL,
    "clickId" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3),
    "lastPolledAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ListeningSession" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "trackCount" INTEGER NOT NULL,
    "totalMinutes" INTEGER NOT NULL,
    "superListenerHit" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ListeningSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Play" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL,
    "spotifyTrackId" TEXT NOT NULL,
    "durationMs" INTEGER,
    "matchedPlaylist" BOOLEAN NOT NULL,

    CONSTRAINT "Play_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserDayAggregate" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "tracksPlayed" INTEGER NOT NULL,
    "uniqueSessions" INTEGER NOT NULL,
    "minutesListened" INTEGER NOT NULL,
    "savedAny" BOOLEAN,
    "followsPlaylist" BOOLEAN,
    "country" TEXT,
    "superListenerDay" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserDayAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LinkDayAggregate" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "connectionsNew" INTEGER NOT NULL,
    "activeListeners" INTEGER NOT NULL,
    "tracksPlayed" INTEGER NOT NULL,
    "minutesListened" INTEGER NOT NULL,
    "superListeners" INTEGER NOT NULL,

    CONSTRAINT "LinkDayAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Playlist_spotifyId_key" ON "public"."Playlist"("spotifyId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaylistTrack_playlistId_spotifyId_key" ON "public"."PlaylistTrack"("playlistId", "spotifyId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingLink_slug_key" ON "public"."TrackingLink"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Click_clickId_key" ON "public"."Click"("clickId");

-- CreateIndex
CREATE UNIQUE INDEX "SpotifyUser_spotifyUserId_key" ON "public"."SpotifyUser"("spotifyUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UserConnection_linkId_spotifyUserId_key" ON "public"."UserConnection"("linkId", "spotifyUserId");

-- CreateIndex
CREATE INDEX "Play_connectionId_playedAt_idx" ON "public"."Play"("connectionId", "playedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserDayAggregate_connectionId_day_key" ON "public"."UserDayAggregate"("connectionId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "LinkDayAggregate_linkId_day_key" ON "public"."LinkDayAggregate"("linkId", "day");

-- AddForeignKey
ALTER TABLE "public"."PlaylistTrack" ADD CONSTRAINT "PlaylistTrack_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "public"."Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TrackingLink" ADD CONSTRAINT "TrackingLink_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "public"."Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Click" ADD CONSTRAINT "Click_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "public"."TrackingLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OAuthToken" ADD CONSTRAINT "OAuthToken_spotifyUserId_fkey" FOREIGN KEY ("spotifyUserId") REFERENCES "public"."SpotifyUser"("spotifyUserId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserConnection" ADD CONSTRAINT "UserConnection_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "public"."TrackingLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserConnection" ADD CONSTRAINT "UserConnection_spotifyUserId_fkey" FOREIGN KEY ("spotifyUserId") REFERENCES "public"."SpotifyUser"("spotifyUserId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ListeningSession" ADD CONSTRAINT "ListeningSession_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "public"."UserConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Play" ADD CONSTRAINT "Play_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "public"."UserConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserDayAggregate" ADD CONSTRAINT "UserDayAggregate_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "public"."UserConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LinkDayAggregate" ADD CONSTRAINT "LinkDayAggregate_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "public"."TrackingLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

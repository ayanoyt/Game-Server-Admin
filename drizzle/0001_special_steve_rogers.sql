CREATE TABLE `activity_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serverId` int NOT NULL,
	`userId` int NOT NULL,
	`action` enum('start','stop','restart','config_change','player_update','status_change','created','deleted','edited') NOT NULL,
	`description` text,
	`previousValue` json,
	`newValue` json,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `database_backups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`backupName` varchar(255) NOT NULL,
	`backupSize` decimal(15,2),
	`backupPath` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`restoredAt` timestamp,
	`description` text,
	CONSTRAINT `database_backups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_servers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`gameType` varchar(100) NOT NULL,
	`ipAddress` varchar(45) NOT NULL,
	`port` int NOT NULL,
	`status` enum('online','offline','maintenance','error') NOT NULL DEFAULT 'offline',
	`maxPlayers` int NOT NULL,
	`currentPlayers` int NOT NULL DEFAULT 0,
	`region` varchar(50) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastStatusCheck` timestamp,
	CONSTRAINT `game_servers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `server_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serverId` int NOT NULL,
	`configKey` varchar(255) NOT NULL,
	`configValue` text,
	`description` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `server_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `server_status_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serverId` int NOT NULL,
	`status` enum('online','offline','maintenance','error') NOT NULL,
	`playersCount` int DEFAULT 0,
	`responseTime` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `server_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionToken` varchar(255) NOT NULL,
	`ipAddress` varchar(45),
	`userAgent` text,
	`lastActivity` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_sessions_sessionToken_unique` UNIQUE(`sessionToken`)
);
--> statement-breakpoint
CREATE TABLE `users_extended` (
	`userId` int NOT NULL,
	`isDisabled` boolean NOT NULL DEFAULT false,
	`passwordHash` varchar(255),
	`lastPasswordChange` timestamp,
	`twoFactorEnabled` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_extended_userId` PRIMARY KEY(`userId`)
);

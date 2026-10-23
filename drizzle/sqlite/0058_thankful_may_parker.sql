CREATE TABLE `decision_configs` (
	`project_id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`endpoint` text NOT NULL,
	`model` text NOT NULL,
	`timeout_ms` integer NOT NULL,
	`encrypted_api_key` text,
	`revision` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);

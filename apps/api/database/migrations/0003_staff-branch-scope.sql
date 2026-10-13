CREATE TABLE "organization_invitation_branches" (
	"organization_id" uuid NOT NULL,
	"invitation_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	CONSTRAINT "organization_invitation_branches_invitation_id_branch_id_pk" PRIMARY KEY("invitation_id","branch_id")
);--> statement-breakpoint
CREATE TABLE "organization_member_branches" (
	"organization_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	CONSTRAINT "organization_member_branches_member_id_branch_id_pk" PRIMARY KEY("member_id","branch_id")
);--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD COLUMN "all_branches" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_members" ADD COLUMN "all_branches" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_org_id_unique" ON "organization_invitations" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "members_org_id_unique" ON "organization_members" USING btree ("organization_id","id");--> statement-breakpoint
ALTER TABLE "organization_invitation_branches" ADD CONSTRAINT "organization_invitation_branches_organization_id_invitation_id_organization_invitations_organization_id_id_fk" FOREIGN KEY ("organization_id","invitation_id") REFERENCES "public"."organization_invitations"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitation_branches" ADD CONSTRAINT "organization_invitation_branches_organization_id_branch_id_branches_organization_id_id_fk" FOREIGN KEY ("organization_id","branch_id") REFERENCES "public"."branches"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member_branches" ADD CONSTRAINT "organization_member_branches_organization_id_member_id_organization_members_organization_id_id_fk" FOREIGN KEY ("organization_id","member_id") REFERENCES "public"."organization_members"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member_branches" ADD CONSTRAINT "organization_member_branches_organization_id_branch_id_branches_organization_id_id_fk" FOREIGN KEY ("organization_id","branch_id") REFERENCES "public"."branches"("organization_id","id") ON DELETE cascade ON UPDATE no action;

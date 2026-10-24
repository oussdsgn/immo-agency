
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "announcements": {
                  Row: {
                    "author_id": string | null,"body_ar": string,"body_fr": string,"id": string,"important": boolean,"published_at": string,"residence_id": string,"title_ar": string,"title_fr": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body_ar": string,"body_fr": string,"id"?: string,"important"?: boolean,"published_at"?: string,"residence_id": string,"title_ar": string,"title_fr": string
                  }
                  Update: {
                    "author_id"?: string | null,"body_ar"?: string,"body_fr"?: string,"id"?: string,"important"?: boolean,"published_at"?: string,"residence_id"?: string,"title_ar"?: string,"title_fr"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "announcements_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "announcements_residence_id_fkey"
      columns: ["residence_id"]
isOneToOne: false
      referencedRelation: "residences"
      referencedColumns: ["id"]
    }
                  ]
                },"buildings": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"residence_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"residence_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"residence_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "buildings_residence_id_fkey"
      columns: ["residence_id"]
isOneToOne: false
      referencedRelation: "residences"
      referencedColumns: ["id"]
    }
                  ]
                },"interest_requests": {
                  Row: {
                    "at": string,"email": string | null,"handled": boolean,"id": string,"listing_id": string,"message": string | null,"name": string,"phone": string,"preferred_contact": string,"profile_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "at"?: string,"email"?: string | null,"handled"?: boolean,"id"?: string,"listing_id": string,"message"?: string | null,"name": string,"phone": string,"preferred_contact"?: string,"profile_id"?: string | null
                  }
                  Update: {
                    "at"?: string,"email"?: string | null,"handled"?: boolean,"id"?: string,"listing_id"?: string,"message"?: string | null,"name"?: string,"phone"?: string,"preferred_contact"?: string,"profile_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "interest_requests_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "interest_requests_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"listings": {
                  Row: {
                    "area_sqm": number | null,"bedrooms": number | null,"city": string,"created_at": string,"description_ar": string,"description_fr": string,"district": string | null,"features": (string)[],"floors": number,"id": string,"kind": string,"palette": string,"price": number | null,"published": boolean,"rooms": number | null,"style": string,"title_ar": string,"title_fr": string,"transaction": string
                  }
                  ComputedFields: never
                  Insert: {
                    "area_sqm"?: number | null,"bedrooms"?: number | null,"city": string,"created_at"?: string,"description_ar"?: string,"description_fr"?: string,"district"?: string | null,"features"?: (string)[],"floors"?: number,"id"?: string,"kind": string,"palette"?: string,"price"?: number | null,"published"?: boolean,"rooms"?: number | null,"style"?: string,"title_ar": string,"title_fr": string,"transaction": string
                  }
                  Update: {
                    "area_sqm"?: number | null,"bedrooms"?: number | null,"city"?: string,"created_at"?: string,"description_ar"?: string,"description_fr"?: string,"district"?: string | null,"features"?: (string)[],"floors"?: number,"id"?: string,"kind"?: string,"palette"?: string,"price"?: number | null,"published"?: boolean,"rooms"?: number | null,"style"?: string,"title_ar"?: string,"title_fr"?: string,"transaction"?: string
                  }
                  Relationships: [
                    
                  ]
                },"notifications": {
                  Row: {
                    "announcement_id": string | null,"at": string,"id": string,"profile_id": string,"read": boolean,"report_id": string | null,"status": Database["public"]['Enums']["report_status"] | null,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "announcement_id"?: string | null,"at"?: string,"id"?: string,"profile_id": string,"read"?: boolean,"report_id"?: string | null,"status"?: Database["public"]['Enums']["report_status"] | null,"type": string
                  }
                  Update: {
                    "announcement_id"?: string | null,"at"?: string,"id"?: string,"profile_id"?: string,"read"?: boolean,"report_id"?: string | null,"status"?: Database["public"]['Enums']["report_status"] | null,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_announcement_id_fkey"
      columns: ["announcement_id"]
isOneToOne: false
      referencedRelation: "announcements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_report_id_fkey"
      columns: ["report_id"]
isOneToOne: false
      referencedRelation: "reports"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string | null,"full_name": string,"id": string,"notification_prefs": NonNullable<Json>,"phone": string | null,"role": Database["public"]['Enums']["user_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string,"id": string,"notification_prefs"?: NonNullable<Json>,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"]
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string,"id"?: string,"notification_prefs"?: NonNullable<Json>,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"]
                  }
                  Relationships: [
                    
                  ]
                },"report_events": {
                  Row: {
                    "actor_id": string | null,"at": string,"id": string,"note": string | null,"report_id": string,"scheduled_at": string | null,"source": string,"status": Database["public"]['Enums']["report_status"],"technician_name": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"at"?: string,"id"?: string,"note"?: string | null,"report_id": string,"scheduled_at"?: string | null,"source": string,"status": Database["public"]['Enums']["report_status"],"technician_name"?: string | null
                  }
                  Update: {
                    "actor_id"?: string | null,"at"?: string,"id"?: string,"note"?: string | null,"report_id"?: string,"scheduled_at"?: string | null,"source"?: string,"status"?: Database["public"]['Enums']["report_status"],"technician_name"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "report_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "report_events_report_id_fkey"
      columns: ["report_id"]
isOneToOne: false
      referencedRelation: "reports"
      referencedColumns: ["id"]
    }
                  ]
                },"report_messages": {
                  Row: {
                    "at": string,"author_id": string | null,"author_kind": string,"author_name": string,"body": string,"id": string,"is_info_request": boolean,"report_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "at"?: string,"author_id"?: string | null,"author_kind": string,"author_name"?: string,"body"?: string,"id"?: string,"is_info_request"?: boolean,"report_id": string
                  }
                  Update: {
                    "at"?: string,"author_id"?: string | null,"author_kind"?: string,"author_name"?: string,"body"?: string,"id"?: string,"is_info_request"?: boolean,"report_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "report_messages_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "report_messages_report_id_fkey"
      columns: ["report_id"]
isOneToOne: false
      referencedRelation: "reports"
      referencedColumns: ["id"]
    }
                  ]
                },"report_photos": {
                  Row: {
                    "added_by": string | null,"added_kind": string,"at": string,"id": string,"message_id": string | null,"name": string,"path": string,"report_id": string,"size_bytes": number
                  }
                  ComputedFields: never
                  Insert: {
                    "added_by"?: string | null,"added_kind": string,"at"?: string,"id"?: string,"message_id"?: string | null,"name"?: string,"path": string,"report_id": string,"size_bytes"?: number
                  }
                  Update: {
                    "added_by"?: string | null,"added_kind"?: string,"at"?: string,"id"?: string,"message_id"?: string | null,"name"?: string,"path"?: string,"report_id"?: string,"size_bytes"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "report_photos_added_by_fkey"
      columns: ["added_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "report_photos_message_id_fkey"
      columns: ["message_id"]
isOneToOne: false
      referencedRelation: "report_messages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "report_photos_report_id_fkey"
      columns: ["report_id"]
isOneToOne: false
      referencedRelation: "reports"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "assignee_id": string | null,"category": string,"created_at": string,"description": string,"feedback_at": string | null,"feedback_comment": string | null,"feedback_rating": number | null,"id": string,"location": string,"reference": string,"resident_id": string | null,"scheduled_at": string | null,"status": Database["public"]['Enums']["report_status"],"title": string,"unit_id": string,"updated_at": string,"urgency": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignee_id"?: string | null,"category": string,"created_at"?: string,"description": string,"feedback_at"?: string | null,"feedback_comment"?: string | null,"feedback_rating"?: number | null,"id"?: string,"location": string,"reference": string,"resident_id"?: string | null,"scheduled_at"?: string | null,"status"?: Database["public"]['Enums']["report_status"],"title": string,"unit_id": string,"updated_at"?: string,"urgency"?: string
                  }
                  Update: {
                    "assignee_id"?: string | null,"category"?: string,"created_at"?: string,"description"?: string,"feedback_at"?: string | null,"feedback_comment"?: string | null,"feedback_rating"?: number | null,"id"?: string,"location"?: string,"reference"?: string,"resident_id"?: string | null,"scheduled_at"?: string | null,"status"?: Database["public"]['Enums']["report_status"],"title"?: string,"unit_id"?: string,"updated_at"?: string,"urgency"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_assignee_id_fkey"
      columns: ["assignee_id"]
isOneToOne: false
      referencedRelation: "technicians"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_resident_id_fkey"
      columns: ["resident_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_unit_id_fkey"
      columns: ["unit_id"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["id"]
    }
                  ]
                },"residences": {
                  Row: {
                    "address": string,"amenities": (string)[],"city": string,"created_at": string,"email": string | null,"emergency_phone": string | null,"floors": number,"guard_phone": string | null,"id": string,"manager_name": string | null,"name": string,"palette": string,"phone": string | null,"style": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string,"amenities"?: (string)[],"city"?: string,"created_at"?: string,"email"?: string | null,"emergency_phone"?: string | null,"floors"?: number,"guard_phone"?: string | null,"id"?: string,"manager_name"?: string | null,"name": string,"palette"?: string,"phone"?: string | null,"style"?: string
                  }
                  Update: {
                    "address"?: string,"amenities"?: (string)[],"city"?: string,"created_at"?: string,"email"?: string | null,"emergency_phone"?: string | null,"floors"?: number,"guard_phone"?: string | null,"id"?: string,"manager_name"?: string | null,"name"?: string,"palette"?: string,"phone"?: string | null,"style"?: string
                  }
                  Relationships: [
                    
                  ]
                },"technicians": {
                  Row: {
                    "active": boolean,"company": string | null,"created_at": string,"id": string,"name": string,"phone": string | null,"trade": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"company"?: string | null,"created_at"?: string,"id"?: string,"name": string,"phone"?: string | null,"trade"?: string
                  }
                  Update: {
                    "active"?: boolean,"company"?: string | null,"created_at"?: string,"id"?: string,"name"?: string,"phone"?: string | null,"trade"?: string
                  }
                  Relationships: [
                    
                  ]
                },"unit_members": {
                  Row: {
                    "created_at": string,"occupancy": Database["public"]['Enums']["occupancy"],"profile_id": string,"unit_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"occupancy"?: Database["public"]['Enums']["occupancy"],"profile_id": string,"unit_id": string
                  }
                  Update: {
                    "created_at"?: string,"occupancy"?: Database["public"]['Enums']["occupancy"],"profile_id"?: string,"unit_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "unit_members_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "unit_members_unit_id_fkey"
      columns: ["unit_id"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["id"]
    }
                  ]
                },"units": {
                  Row: {
                    "access_code": string,"area_sqm": number | null,"building_id": string,"created_at": string,"floor": number | null,"id": string,"number": string,"rooms": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "access_code"?: string,"area_sqm"?: number | null,"building_id": string,"created_at"?: string,"floor"?: number | null,"id"?: string,"number": string,"rooms"?: number | null
                  }
                  Update: {
                    "access_code"?: string,"area_sqm"?: number | null,"building_id"?: string,"created_at"?: string,"floor"?: number | null,"id"?: string,"number"?: string,"rooms"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "units_building_id_fkey"
      columns: ["building_id"]
isOneToOne: false
      referencedRelation: "buildings"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "agency_can_transition":
{ Args: { "p_from": Database["public"]['Enums']["report_status"],"p_to": Database["public"]['Enums']["report_status"] }; Returns: boolean
                           },
"bootstrap_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"can_see_report":
{ Args: { "p_report": string }; Returns: boolean
                           },
"claim_unit":
{ Args: { "p_code": string,"p_occupancy"?: Database["public"]['Enums']["occupancy"] }; Returns: string
                           },
"dispatch_report":
{ Args: { "p_note"?: string,"p_report": string,"p_scheduled_at": string,"p_technician": string }; Returns: undefined
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_unit_member":
{ Args: { "p_unit": string }; Returns: boolean
                           },
"my_residence_ids":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"new_access_code":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"notify_unit":
{ Args: { "p_report": string,"p_status": Database["public"]['Enums']["report_status"],"p_type": string }; Returns: undefined
                           },
"regenerate_access_code":
{ Args: { "p_unit": string }; Returns: string
                           },
"report_id_from_path":
{ Args: { "p_name": string }; Returns: string
                           },
"report_is_open":
{ Args: { "s": Database["public"]['Enums']["report_status"] }; Returns: boolean
                           },
"request_info":
{ Args: { "p_body": string,"p_report": string }; Returns: undefined
                           },
"set_report_status":
{ Args: { "p_note"?: string,"p_report": string,"p_status": Database["public"]['Enums']["report_status"] }; Returns: undefined
                           },
"set_staff_role":
{ Args: { "p_profile": string,"p_role": Database["public"]['Enums']["user_role"] }; Returns: undefined
                           },
"submit_feedback":
{ Args: { "p_comment"?: string,"p_fixed": boolean,"p_rating"?: number,"p_report": string }; Returns: undefined
                           },
"unit_access_codes":
{ Args: Record<PropertyKey, never>; Returns: {
              "access_code": string,"unit_id": string
            }[]
                           }
          }
          Enums: {
            "occupancy": "owner"|"tenant","report_status": "submitted"|"under_review"|"in_progress"|"awaiting_resident"|"resolved"|"closed"|"rejected","user_role": "resident"|"pending_staff"|"agent"|"admin"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "occupancy": ["owner", "tenant"],"report_status": ["submitted", "under_review", "in_progress", "awaiting_resident", "resolved", "closed", "rejected"],"user_role": ["resident", "pending_staff", "agent", "admin"]
          }
        }
} as const

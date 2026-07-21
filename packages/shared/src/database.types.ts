export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      acordo_anexos: {
        Row: {
          acordo_id: string
          created_at: string
          id: string
          nome: string
          path: string
          tamanho: number | null
          tenant_id: string
          tipo: string | null
        }
        Insert: {
          acordo_id: string
          created_at?: string
          id?: string
          nome: string
          path: string
          tamanho?: number | null
          tenant_id: string
          tipo?: string | null
        }
        Update: {
          acordo_id?: string
          created_at?: string
          id?: string
          nome?: string
          path?: string
          tamanho?: number | null
          tenant_id?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acordo_anexos_acordo_id_fkey"
            columns: ["acordo_id"]
            isOneToOne: false
            referencedRelation: "acordos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acordo_anexos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      acordo_pagamentos: {
        Row: {
          acordo_id: string
          beneficiario: string | null
          created_at: string
          data: string
          id: string
          observacoes: string | null
          recebido_pago: Database["public"]["Enums"]["recebido_pago"]
          tenant_id: string
          valor: number
        }
        Insert: {
          acordo_id: string
          beneficiario?: string | null
          created_at?: string
          data?: string
          id?: string
          observacoes?: string | null
          recebido_pago?: Database["public"]["Enums"]["recebido_pago"]
          tenant_id: string
          valor?: number
        }
        Update: {
          acordo_id?: string
          beneficiario?: string | null
          created_at?: string
          data?: string
          id?: string
          observacoes?: string | null
          recebido_pago?: Database["public"]["Enums"]["recebido_pago"]
          tenant_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "acordo_pagamentos_acordo_id_fkey"
            columns: ["acordo_id"]
            isOneToOne: false
            referencedRelation: "acordos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acordo_pagamentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      acordo_sequencias: {
        Row: {
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_acordo"]
          ultimo_numero: number
        }
        Insert: {
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_acordo"]
          ultimo_numero?: number
        }
        Update: {
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_acordo"]
          ultimo_numero?: number
        }
        Relationships: [
          {
            foreignKeyName: "acordo_sequencias_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      acordos: {
        Row: {
          caso: string
          codigo_caso: string | null
          created_at: string
          id: string
          link_drive: string | null
          negocio_id: string | null
          observacoes: string | null
          responsavel: string | null
          saldo: number
          status: Database["public"]["Enums"]["status_acordo"]
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_acordo"] | null
          valor_original: number
          valor_recuperado_pago: number
        }
        Insert: {
          caso: string
          codigo_caso?: string | null
          created_at?: string
          id?: string
          link_drive?: string | null
          negocio_id?: string | null
          observacoes?: string | null
          responsavel?: string | null
          saldo?: number
          status?: Database["public"]["Enums"]["status_acordo"]
          tenant_id: string
          tipo?: Database["public"]["Enums"]["tipo_acordo"] | null
          valor_original?: number
          valor_recuperado_pago?: number
        }
        Update: {
          caso?: string
          codigo_caso?: string | null
          created_at?: string
          id?: string
          link_drive?: string | null
          negocio_id?: string | null
          observacoes?: string | null
          responsavel?: string | null
          saldo?: number
          status?: Database["public"]["Enums"]["status_acordo"]
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_acordo"] | null
          valor_original?: number
          valor_recuperado_pago?: number
        }
        Relationships: [
          {
            foreignKeyName: "acordos_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acordos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assinaturas: {
        Row: {
          created_at: string
          gateway: string | null
          gateway_subscription_id: string | null
          id: string
          periodo_fim: string | null
          periodo_inicio: string | null
          plano_id: string
          status: Database["public"]["Enums"]["status_assinatura"]
          tenant_id: string
        }
        Insert: {
          created_at?: string
          gateway?: string | null
          gateway_subscription_id?: string | null
          id?: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
          plano_id: string
          status?: Database["public"]["Enums"]["status_assinatura"]
          tenant_id: string
        }
        Update: {
          created_at?: string
          gateway?: string | null
          gateway_subscription_id?: string | null
          id?: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
          plano_id?: string
          status?: Database["public"]["Enums"]["status_assinatura"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          acao: string
          ator_usuario_id: string | null
          created_at: string
          entidade: string | null
          entidade_id: string | null
          id: string
          payload: Json | null
          tenant_id: string | null
        }
        Insert: {
          acao: string
          ator_usuario_id?: string | null
          created_at?: string
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          payload?: Json | null
          tenant_id?: string | null
        }
        Update: {
          acao?: string
          ator_usuario_id?: string | null
          created_at?: string
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          payload?: Json | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_ator_usuario_id_fkey"
            columns: ["ator_usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campanha_envios: {
        Row: {
          campanha_id: string
          claimed_at: string | null
          contato_id: string
          created_at: string
          enviado_at: string | null
          erro: string | null
          id: string
          status: Database["public"]["Enums"]["status_envio"]
          tenant_id: string
        }
        Insert: {
          campanha_id: string
          claimed_at?: string | null
          contato_id: string
          created_at?: string
          enviado_at?: string | null
          erro?: string | null
          id?: string
          status?: Database["public"]["Enums"]["status_envio"]
          tenant_id: string
        }
        Update: {
          campanha_id?: string
          claimed_at?: string | null
          contato_id?: string
          created_at?: string
          enviado_at?: string | null
          erro?: string | null
          id?: string
          status?: Database["public"]["Enums"]["status_envio"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanha_envios_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanha_envios_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanha_envios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campanhas: {
        Row: {
          created_at: string
          criado_por: string | null
          id: string
          negocio_id: string | null
          status: Database["public"]["Enums"]["status_campanha"]
          template_texto: string
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_campanha"]
          total_destinatarios: number
          total_enviados: number
          total_falhas: number
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          id?: string
          negocio_id?: string | null
          status?: Database["public"]["Enums"]["status_campanha"]
          template_texto: string
          tenant_id: string
          tipo?: Database["public"]["Enums"]["tipo_campanha"]
          total_destinatarios?: number
          total_enviados?: number
          total_falhas?: number
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          id?: string
          negocio_id?: string | null
          status?: Database["public"]["Enums"]["status_campanha"]
          template_texto?: string
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_campanha"]
          total_destinatarios?: number
          total_enviados?: number
          total_falhas?: number
        }
        Relationships: [
          {
            foreignKeyName: "campanhas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanhas_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanhas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      canal_investimentos: {
        Row: {
          competencia: string
          created_at: string
          custo_captadora: number
          fonte_id: string | null
          id: string
          investimento: number
          leads: number
          observacoes: string | null
          tenant_id: string
        }
        Insert: {
          competencia: string
          created_at?: string
          custo_captadora?: number
          fonte_id?: string | null
          id?: string
          investimento?: number
          leads?: number
          observacoes?: string | null
          tenant_id: string
        }
        Update: {
          competencia?: string
          created_at?: string
          custo_captadora?: number
          fonte_id?: string | null
          id?: string
          investimento?: number
          leads?: number
          observacoes?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "canal_investimentos_fonte_id_fkey"
            columns: ["fonte_id"]
            isOneToOne: false
            referencedRelation: "fontes_lead"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canal_investimentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      centros_custo: {
        Row: {
          created_at: string
          id: string
          nome: string
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_centro"]
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          tenant_id: string
          tipo?: Database["public"]["Enums"]["tipo_centro"]
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_centro"]
        }
        Relationships: [
          {
            foreignKeyName: "centros_custo_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contatos: {
        Row: {
          ativo: boolean
          cidade: string | null
          created_at: string
          id: string
          nome: string
          observacoes: string | null
          opt_in_whatsapp: boolean
          tags: string[]
          telefone: string
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_contato"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cidade?: string | null
          created_at?: string
          id?: string
          nome: string
          observacoes?: string | null
          opt_in_whatsapp?: boolean
          tags?: string[]
          telefone: string
          tenant_id: string
          tipo?: Database["public"]["Enums"]["tipo_contato"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cidade?: string | null
          created_at?: string
          id?: string
          nome?: string
          observacoes?: string | null
          opt_in_whatsapp?: boolean
          tags?: string[]
          telefone?: string
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_contato"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contatos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_templates: {
        Row: {
          corpo: string
          created_at: string
          id: string
          nome: string
          padrao: boolean
          tenant_id: string
        }
        Insert: {
          corpo: string
          created_at?: string
          id?: string
          nome: string
          padrao?: boolean
          tenant_id: string
        }
        Update: {
          corpo?: string
          created_at?: string
          id?: string
          nome?: string
          padrao?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contrato_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          created_at: string
          dados_cliente: Json
          id: string
          negocio_id: string
          pdf_url: string | null
          status: Database["public"]["Enums"]["status_contrato"]
          template_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          dados_cliente?: Json
          id?: string
          negocio_id: string
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["status_contrato"]
          template_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          dados_cliente?: Json
          id?: string
          negocio_id?: string
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["status_contrato"]
          template_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratos_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contrato_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fontes_lead: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_fonte"]
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          tenant_id: string
          tipo?: Database["public"]["Enums"]["tipo_fonte"]
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_fonte"]
        }
        Relationships: [
          {
            foreignKeyName: "fontes_lead_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos_custo: {
        Row: {
          centro_custo_id: string
          created_at: string
          data_pagamento: string
          descricao: string
          id: string
          negocio_id: string | null
          observacoes: string | null
          tenant_id: string
          valor: number
        }
        Insert: {
          centro_custo_id: string
          created_at?: string
          data_pagamento?: string
          descricao: string
          id?: string
          negocio_id?: string | null
          observacoes?: string | null
          tenant_id: string
          valor?: number
        }
        Update: {
          centro_custo_id?: string
          created_at?: string
          data_pagamento?: string
          descricao?: string
          id?: string
          negocio_id?: string | null
          observacoes?: string | null
          tenant_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_custo_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_custo_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_custo_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      negocio_fotos: {
        Row: {
          created_at: string
          id: string
          is_capa: boolean
          negocio_id: string
          ordem: number
          tenant_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_capa?: boolean
          negocio_id: string
          ordem?: number
          tenant_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_capa?: boolean
          negocio_id?: string
          ordem?: number
          tenant_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "negocio_fotos_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocio_fotos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      negocios: {
        Row: {
          ano: number | null
          carro: string
          comissao_terceiros: number
          comprador_id: string | null
          created_at: string
          custos_operacionais: number
          custos_pagos_cliente: number
          data_entrega: string | null
          data_negocio: string
          data_retirada: string | null
          fipe: number | null
          fonte_id: string | null
          gastos: string | null
          id: string
          ipva_status: Database["public"]["Enums"]["ipva_status"] | null
          km: number | null
          link_drive: string | null
          lucro: number | null
          observacoes: string | null
          placa: string | null
          pneus: string | null
          preco_pedido: number | null
          status: Database["public"]["Enums"]["status_negocio"]
          tenant_id: string
          tipo_documento: Database["public"]["Enums"]["tipo_documento"] | null
          updated_at: string
          valor_compra: number
          valor_venda: number
        }
        Insert: {
          ano?: number | null
          carro: string
          comissao_terceiros?: number
          comprador_id?: string | null
          created_at?: string
          custos_operacionais?: number
          custos_pagos_cliente?: number
          data_entrega?: string | null
          data_negocio?: string
          data_retirada?: string | null
          fipe?: number | null
          fonte_id?: string | null
          gastos?: string | null
          id?: string
          ipva_status?: Database["public"]["Enums"]["ipva_status"] | null
          km?: number | null
          link_drive?: string | null
          lucro?: number | null
          observacoes?: string | null
          placa?: string | null
          pneus?: string | null
          preco_pedido?: number | null
          status?: Database["public"]["Enums"]["status_negocio"]
          tenant_id: string
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"] | null
          updated_at?: string
          valor_compra?: number
          valor_venda?: number
        }
        Update: {
          ano?: number | null
          carro?: string
          comissao_terceiros?: number
          comprador_id?: string | null
          created_at?: string
          custos_operacionais?: number
          custos_pagos_cliente?: number
          data_entrega?: string | null
          data_negocio?: string
          data_retirada?: string | null
          fipe?: number | null
          fonte_id?: string | null
          gastos?: string | null
          id?: string
          ipva_status?: Database["public"]["Enums"]["ipva_status"] | null
          km?: number | null
          link_drive?: string | null
          lucro?: number | null
          observacoes?: string | null
          placa?: string | null
          pneus?: string | null
          preco_pedido?: number | null
          status?: Database["public"]["Enums"]["status_negocio"]
          tenant_id?: string
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"] | null
          updated_at?: string
          valor_compra?: number
          valor_venda?: number
        }
        Relationships: [
          {
            foreignKeyName: "negocios_comprador_id_fkey"
            columns: ["comprador_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocios_fonte_id_fkey"
            columns: ["fonte_id"]
            isOneToOne: false
            referencedRelation: "fontes_lead"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      planos: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          limite_contatos: number
          limite_envios_mes: number
          limite_usuarios: number
          modulos: Json
          nome: string
          preco_mensal: number
          white_label: boolean
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          limite_contatos?: number
          limite_envios_mes?: number
          limite_usuarios?: number
          modulos?: Json
          nome: string
          preco_mensal?: number
          white_label?: boolean
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          limite_contatos?: number
          limite_envios_mes?: number
          limite_usuarios?: number
          modulos?: Json
          nome?: string
          preco_mensal?: number
          white_label?: boolean
        }
        Relationships: []
      }
      tenant_usuarios: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          papel: Database["public"]["Enums"]["papel_tenant"]
          tenant_id: string
          usuario_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          papel?: Database["public"]["Enums"]["papel_tenant"]
          tenant_id: string
          usuario_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          papel?: Database["public"]["Enums"]["papel_tenant"]
          tenant_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_usuarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_usuarios_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          cor_primaria: string | null
          created_at: string
          dominio_custom: string | null
          email_remetente: string | null
          id: string
          logo_url: string | null
          nome: string
          override_limite_envios_mes: number | null
          plano_id: string | null
          slug: string
          status_assinatura: Database["public"]["Enums"]["status_assinatura"]
          template_campanha: string | null
          template_contrato: string | null
          trial_expira_em: string | null
        }
        Insert: {
          cor_primaria?: string | null
          created_at?: string
          dominio_custom?: string | null
          email_remetente?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          override_limite_envios_mes?: number | null
          plano_id?: string | null
          slug: string
          status_assinatura?: Database["public"]["Enums"]["status_assinatura"]
          template_campanha?: string | null
          template_contrato?: string | null
          trial_expira_em?: string | null
        }
        Update: {
          cor_primaria?: string | null
          created_at?: string
          dominio_custom?: string | null
          email_remetente?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          override_limite_envios_mes?: number | null
          plano_id?: string | null
          slug?: string
          status_assinatura?: Database["public"]["Enums"]["status_assinatura"]
          template_campanha?: string | null
          template_contrato?: string | null
          trial_expira_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      uso_mensal: {
        Row: {
          competencia: string
          envios_whatsapp: number
          id: string
          tenant_id: string
        }
        Insert: {
          competencia: string
          envios_whatsapp?: number
          id?: string
          tenant_id: string
        }
        Update: {
          competencia?: string
          envios_whatsapp?: number
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uso_mensal_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          created_at: string
          email: string
          id: string
          nome: string | null
          telefone: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          nome?: string | null
          telefone?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      whatsapp_instances: {
        Row: {
          api_key: string | null
          api_url: string | null
          created_at: string
          id: string
          instance_name: string | null
          last_seen: string | null
          numero: string | null
          provider: Database["public"]["Enums"]["provider_whatsapp"]
          status: Database["public"]["Enums"]["status_instancia"]
          tenant_id: string
        }
        Insert: {
          api_key?: string | null
          api_url?: string | null
          created_at?: string
          id?: string
          instance_name?: string | null
          last_seen?: string | null
          numero?: string | null
          provider?: Database["public"]["Enums"]["provider_whatsapp"]
          status?: Database["public"]["Enums"]["status_instancia"]
          tenant_id: string
        }
        Update: {
          api_key?: string | null
          api_url?: string | null
          created_at?: string
          id?: string
          instance_name?: string | null
          last_seen?: string | null
          numero?: string | null
          provider?: Database["public"]["Enums"]["provider_whatsapp"]
          status?: Database["public"]["Enums"]["status_instancia"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_acordos_mensal: {
        Row: {
          acordos_pagos: number | null
          acordos_recebidos: number | null
          competencia: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acordo_pagamentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_custos_mensal: {
        Row: {
          centro: string | null
          competencia: string | null
          tenant_id: string | null
          tipo_centro: Database["public"]["Enums"]["tipo_centro"] | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_custo_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_negocios_mensal: {
        Row: {
          comissao_terceiros: number | null
          competencia: string | null
          custo_compra: number | null
          custos_operacionais: number | null
          custos_pagos_cliente: number | null
          lucro: number | null
          num_negocios: number | null
          num_vendas: number | null
          receita_bruta: number | null
          receita_venda: number | null
          tenant_id: string | null
          ticket_medio: number | null
        }
        Relationships: [
          {
            foreignKeyName: "negocios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auth_can_write: { Args: never; Returns: boolean }
      auth_is_tenant_admin: { Args: never; Returns: boolean }
      auth_papel: { Args: never; Returns: string }
      auth_tenant_id: { Args: never; Returns: string }
      carro_publico: { Args: { p_negocio_id: string }; Returns: Json }
      criar_tenant: {
        Args: { p_nome: string; p_slug: string }
        Returns: string
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      dre_anual: {
        Args: { p_ano: number }
        Returns: {
          acordos_pagos: number
          acordos_recebidos: number
          comissao_terceiros: number
          competencia: string
          crescimento_pct: number
          custos_operacionais: number
          custos_pagos_cliente: number
          folha: number
          lucro_liquido: number
          marketing: number
          nao_operacional: number
          num_vendas: number
          receita_bruta: number
          ticket_medio: number
        }[]
      }
      envios_restantes: { Args: never; Returns: number }
      impersonar_tenant: { Args: { p_tenant_id: string }; Returns: undefined }
      is_super_admin: { Args: never; Returns: boolean }
      liberar_envios: { Args: { p_destinatarios: number }; Returns: undefined }
      optout_contato: { Args: { p_id: string }; Returns: boolean }
      parar_impersonacao: { Args: never; Returns: undefined }
      pode_disparar: { Args: { p_destinatarios: number }; Returns: boolean }
      registrar_auditoria: {
        Args: {
          p_acao: string
          p_entidade: string
          p_entidade_id: string
          p_payload?: Json
          p_tenant: string
        }
        Returns: undefined
      }
      registrar_envios: {
        Args: { p_qtd: number; p_tenant: string }
        Returns: undefined
      }
      reservar_envios: { Args: { p_destinatarios: number }; Returns: boolean }
      roi_por_canal: {
        Args: { p_fim: string; p_inicio: string }
        Returns: {
          cpl: number
          cps: number
          custo_captadora: number
          fonte: string
          fonte_id: string
          investimento: number
          leads: number
          lucro_bruto: number
          lucro_liquido: number
          num_vendas: number
          participacao_pct: number
          ticket_medio: number
        }[]
      }
      set_active_tenant: { Args: { p_tenant_id: string }; Returns: undefined }
    }
    Enums: {
      ipva_status: "pago" | "aberto"
      papel_tenant: "owner" | "admin" | "operador" | "financeiro" | "viewer"
      provider_whatsapp: "evolution" | "cloud_api"
      recebido_pago: "recebido" | "pago"
      status_acordo:
        | "em_pagamento"
        | "notificacao_extrajudicial"
        | "nao_cumpriu_acordo"
        | "aguardando"
        | "pago"
      status_assinatura: "trial" | "ativa" | "inadimplente" | "cancelada"
      status_campanha:
        | "rascunho"
        | "enfileirada"
        | "enviando"
        | "concluida"
        | "falha"
      status_contrato: "rascunho" | "gerado" | "assinado"
      status_envio: "pendente" | "enviado" | "entregue" | "lido" | "falha"
      status_instancia: "desconectada" | "conectada" | "banida"
      status_negocio: "em_negociacao" | "vendido" | "entregue" | "problema"
      tipo_acordo: "pagamento" | "recebimento"
      tipo_campanha: "novo_carro" | "manual"
      tipo_centro: "operacional" | "nao_operacional"
      tipo_contato: "lojista" | "cliente_final" | "captador"
      tipo_documento: "procuracao" | "dut"
      tipo_fonte: "pago" | "organico"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ipva_status: ["pago", "aberto"],
      papel_tenant: ["owner", "admin", "operador", "financeiro", "viewer"],
      provider_whatsapp: ["evolution", "cloud_api"],
      recebido_pago: ["recebido", "pago"],
      status_acordo: [
        "em_pagamento",
        "notificacao_extrajudicial",
        "nao_cumpriu_acordo",
        "aguardando",
        "pago",
      ],
      status_assinatura: ["trial", "ativa", "inadimplente", "cancelada"],
      status_campanha: [
        "rascunho",
        "enfileirada",
        "enviando",
        "concluida",
        "falha",
      ],
      status_contrato: ["rascunho", "gerado", "assinado"],
      status_envio: ["pendente", "enviado", "entregue", "lido", "falha"],
      status_instancia: ["desconectada", "conectada", "banida"],
      status_negocio: ["em_negociacao", "vendido", "entregue", "problema"],
      tipo_acordo: ["pagamento", "recebimento"],
      tipo_campanha: ["novo_carro", "manual"],
      tipo_centro: ["operacional", "nao_operacional"],
      tipo_contato: ["lojista", "cliente_final", "captador"],
      tipo_documento: ["procuracao", "dut"],
      tipo_fonte: ["pago", "organico"],
    },
  },
} as const

'use client';

import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import type { Project } from '@/lib/types';

type ReportProject = Project & {
  code?: string | null;
  client_name?: string | null;
  cnpj?: string | null;
  city?: string | null;
  state?: string | null;
  segment?: string | null;
  interests?: string[] | null;
  is_existing_client?: boolean | null;
  is_same_location?: boolean | null;
  test_location_address?: string | null;
  status?: string | null;
  monthly_consumption?: string | null;
  suggested_date?: string | null;
  justification?: string | null;
};

type ReportResponsible = {
  name?: string | null;
  role?: string | null;
  phone?: string | null;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1e293b',
    lineHeight: 1.4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: '#ea580c',
    paddingBottom: 8,
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 38,
    height: 38,
    marginRight: 8,
    objectFit: 'contain',
  },
  brand: {
    fontSize: 7.5,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    color: '#ea580c',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 2,
    marginBottom: 2,
  },
  code: {
    fontSize: 8.5,
    color: '#64748b',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 8.5,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emittedAt: {
    fontSize: 7.5,
    color: '#94a3b8',
  },
  block: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 5,
    padding: 8,
    marginBottom: 10,
  },
  blockTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#ea580c',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 4,
    marginBottom: 7,
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  fieldCol: {
    width: '50%',
  },
  fieldFull: {
    width: '100%',
    marginBottom: 4,
  },
  label: {
    color: '#64748b',
  },
  value: {
    color: '#1e293b',
    fontWeight: 'bold',
  },
  boxLabel: {
    color: '#64748b',
    fontSize: 8,
    marginTop: 6,
    marginBottom: 3,
  },
  box: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 5,
    marginBottom: 6,
    color: '#1e293b',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 6,
    marginTop: 10,
    color: '#94a3b8',
    fontSize: 7.5,
  },
});

function statusColors(status?: string | null) {
  const s = (status || '').toLowerCase();
  if (s.includes('aprov') || s.includes('conclu'))
    return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
  if (s.includes('andamento'))
    return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
  if (s.includes('pend'))
    return { bg: '#fffbeb', color: '#b45309', border: '#fde68a' };
  if (s.includes('paus') || s.includes('encerr') || s.includes('reprov'))
    return { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' };
  return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
}

export function ProjectReportPdf({
  project,
  responsibles = [],
  logoUrl,
}: {
  project: Project;
  responsibles?: ReportResponsible[];
  logoUrl?: string;
}) {
  const p = project as ReportProject;
  const status = statusColors(p.status);
  const sameLocation = p.is_same_location ?? true;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {logoUrl && <Image src={logoUrl} style={styles.logo} />}
            <View>
              <Text style={styles.brand}>CwPack / Delpack</Text>
              <Text style={styles.title}>Resumo Executivo do Projeto</Text>
              <Text style={styles.code}>
                Código: <Text style={styles.value}>{p.code || '-'}</Text>
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: status.bg, color: status.color, borderWidth: 1, borderColor: status.border },
              ]}
            >
              <Text>{p.status || 'Em Andamento'}</Text>
            </View>
            <Text style={styles.emittedAt}>
              Emitido em: {new Date().toLocaleDateString('pt-BR')}
            </Text>
          </View>
        </View>

        {/* 1. Dados do Cliente */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>1. Dados do Cliente</Text>
          <View style={styles.fieldRow}>
            <View style={styles.fieldCol}>
              <Text>
                <Text style={styles.label}>Já é cliente? </Text>
                <Text style={styles.value}>{p.is_existing_client ? 'Sim' : 'Não'}</Text>
              </Text>
            </View>
            <View style={styles.fieldCol}>
              <Text>
                <Text style={styles.label}>CNPJ: </Text>
                <Text style={styles.value}>{p.cnpj || 'Não informado'}</Text>
              </Text>
            </View>
          </View>
          <View style={styles.fieldFull}>
            <Text>
              <Text style={styles.label}>Cliente / Razão Social: </Text>
              <Text style={styles.value}>{p.client_name || 'Não informado'}</Text>
            </Text>
          </View>
          <View style={styles.fieldRow}>
            <View style={styles.fieldCol}>
              <Text>
                <Text style={styles.label}>Endereço: </Text>
                <Text style={styles.value}>{p.city || '—'}</Text>
              </Text>
            </View>
            <View style={styles.fieldCol}>
              <Text>
                <Text style={styles.label}>Estado: </Text>
                <Text style={styles.value}>{p.state || '—'}</Text>
              </Text>
            </View>
          </View>
          <View style={styles.fieldFull}>
            <Text>
              <Text style={styles.label}>Segmento de Atuação: </Text>
              <Text style={styles.value}>{p.segment || '—'}</Text>
            </Text>
          </View>
          <Text style={styles.boxLabel}>Projetos de Interesse:</Text>
          <View style={styles.box}>
            <Text>{p.interests?.length ? p.interests.join(' • ') : 'Não informado'}</Text>
          </View>
          <View style={styles.fieldRow}>
            <View style={styles.fieldCol}>
              <Text>
                <Text style={styles.label}>Local do teste é o mesmo endereço? </Text>
                <Text style={styles.value}>{sameLocation ? 'Sim' : 'Não'}</Text>
              </Text>
            </View>
            {!sameLocation && (
              <View style={styles.fieldCol}>
                <Text>
                  <Text style={styles.label}>Endereço do Local do Teste: </Text>
                  <Text style={styles.value}>{p.test_location_address || 'Não informado'}</Text>
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 2. Responsáveis no Cliente */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>2. Responsáveis no Cliente</Text>
          {responsibles.length === 0 ? (
            <View style={styles.box}>
              <Text>Nenhum responsável cadastrado.</Text>
            </View>
          ) : (
            responsibles.map((r, i) => (
              <View key={i} style={styles.box}>
                <Text>
                  <Text style={styles.label}>Nome: </Text>
                  <Text style={styles.value}>{r.name || '—'}</Text>
                </Text>
                <Text>
                  <Text style={styles.label}>Cargo/Função: </Text>
                  <Text style={styles.value}>{r.role || '—'}</Text>
                </Text>
                <Text>
                  <Text style={styles.label}>WhatsApp/Telefone: </Text>
                  <Text style={styles.value}>{r.phone || '—'}</Text>
                </Text>
              </View>
            ))
          )}
        </View>

        {/* 3. Termos Comerciais */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>3. Termos Comerciais</Text>
          <View style={styles.fieldRow}>
            <View style={styles.fieldCol}>
              <Text>
                <Text style={styles.label}>Média de Consumo Mensal: </Text>
                <Text style={styles.value}>{p.monthly_consumption || '-'}</Text>
              </Text>
            </View>
            <View style={styles.fieldCol}>
              <Text>
                <Text style={styles.label}>Data Sugerida: </Text>
                <Text style={styles.value}>{p.suggested_date || 'Não informada'}</Text>
              </Text>
            </View>
          </View>
          <Text style={styles.boxLabel}>Expectativas / Técnicas e Embalagens:</Text>
          <View style={styles.box}>
            <Text>{p.justification || 'Não informado'}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>CwPack / Delpack — Sistema de Gestão de Projetos de Validação</Text>
          <Text>Relatório Executivo — {new Date().toLocaleDateString('pt-BR')}</Text>
        </View>
      </Page>
    </Document>
  );
}
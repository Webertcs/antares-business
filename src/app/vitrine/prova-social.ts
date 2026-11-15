/**
 * ANTARES Kids — provas sociais públicas, somente após conferência.
 *
 * Não incluir números estimados, resultados de teste do CRM ou depoimentos fictícios.
 * Para publicar uma avaliação: autorização documentada da pessoa/instituição, texto fiel
 * e identidade de exibição acordada. Não incluir dados de crianças.
 * Para publicar um indicador: apuração verificável e período definido.
 *
 * Estas listas ficam vazias até recebermos dados verdadeiros e autorizados.
 */
export type VerifiedMetric = {
  id:string;
  count:number;
  label:string;
  period:string;
  verified:boolean;
};
export type AuthorizedTestimonial = {
  id:string;
  quote:string;
  displayName:string;
  institution:string;
  authorized:boolean;
};

export const verifiedMetrics:VerifiedMetric[]=[];
export const authorizedTestimonials:AuthorizedTestimonial[]=[];

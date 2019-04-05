import * as d3 from 'D3';
import * as app from './app'

const qo = require('./queryObject');
const neoAPI = require('./neo4jLoader');
const gCanvas = require('./graphRender');

const got = require('got');
import ky from 'ky';
import { SrvRecord } from 'dns';
import { buildSubGraph } from './neo4jLoader';

export async function searchMachine(command:string, value:string){

    const builder = {
        'Search Gene' : addGene,
        'Search Function' : testingSpace,//phenoTest,
        'Search Pathway' : addPathway,//drawPhenotypes,
        'Search Models' : testingSpace,
        'Search Variant': addVariant,
        'Search GO': addFromGo,
    }

    let fun = builder[command];
    
    let response = await fun(value);

    d3.select('#topnav').select('.input-group.search').select('input.form-control').node().value = '';

    let queryBox = d3.select('#graph-render').append('div').classed('query-box', true);
    let head = queryBox.append('div').classed('header', true);
    let closebutton = head.append('button').classed('close', true).attr('aria-label', "Close");
    closebutton.append('span').attr('aria-hidden', "true").append('text').text('x');

    closebutton.on('click', ()=> {
        d3.select('#graph-render').select('.query-box').remove();
    });

    if(response != undefined){

        if(command == 'Search Gene'){
            //this is the same for initial load - maybe brerak this up
            let varAlleles = await app.variantObjectMaker(response.properties.Variants, response.name);
            let vars = qo.structVariants(await varAlleles);
            response.properties.Variants = await Promise.resolve(vars);

            let structuredPheno = await qo.structPheno(response.properties.Phenotypes, response.name);
            response.properties.Phenotypes.nodes = structuredPheno;

            // let enrighmentP = await search.searchStringEnrichment(no.name);

            let addbutton = head.append('button').classed('btn btn-outline-primary', true);
            addbutton.append('text').text('Add to Graph');
            addbutton.on('click', ()=> {
                console.log('clicked', buildSubGraph);
                neoAPI.buildSubGraph(response);
            });

       
            let text = queryBox.append('div');
            text.append('h3').text('Found for '+ value);
            text.append('h4').text('Symbol: '+ response.name);
            text.append('h4').text('Type: '+ response.type);

            let blurbP = text.append('div');
            let blurbHeaderP = blurbP.append('h4').text('Associated Phenotypes: ');
            let blurbEnterP = blurbP.selectAll('.found-blurb-pheno').data(response.properties.Phenotypes.nodes).enter().append('div').classed('found-blurb-pheno', true);
            blurbEnterP.append('text').text(d=> d.properties.description)
            
            let blurbV = text.append('div');
            let blurbHeaderV = blurbV.append('h4').text('Identified Variants: ');
            let blurbEnterV = blurbV.selectAll('.found-blurb-var').data(response.properties.Variants).enter().append('div').classed('found-blurb-var', true);
            blurbEnterV.append('text').text(d => d.name);
            let spanType = blurbEnterV.append('span').text(d=> d.properties.class);
            spanType.classed('badge badge-info', true);

            let spanCons = blurbEnterV.append('span').text(d=> {
                let cons = d.properties.Consequence != null? d.properties.Consequence : '';
                return cons;
            });
            spanCons.attr('class', d=> d.properties.Consequence);
            spanCons.classed('badge badge-info', true);

            let blurbT = text.append('div');
            let blurbHeaderT = blurbT.append('h4').text('Literature: ');
            let blurbEnterT = blurbT.selectAll('.found-blurb-text').data(response.properties.Text).enter().append('div').classed('found-blurb-text', true);
            blurbEnterT.append('h6').text(d=> d.textSectionTitle+': ');
            blurbEnterT.append('text').text(d=> d.textSectionContent);

        }else if(command == 'Search Variant'){

            console.log('returned var stuff', response);

              // let enrighmentP = await search.searchStringEnrichment(no.name);

              let addbutton = head.append('button').classed('btn btn-outline-primary', true);
              addbutton.append('text').text('Add to Graph');
              addbutton.on('click', ()=> {
                  neoAPI.buildSubGraph(response.gene);
              });
              let variant = response.variant;

              let text = queryBox.append('div');
              text.append('h3').text('Found for '+ value);
              text.append('h4').text('Name: '+ variant.name);
              text.append('h4').text('Type: '+ variant.type);

              let spanType = text.append('span').text(d=> variant.properties.class);
              spanType.classed('badge badge-info', true);

              let spanCons = text.append('span').text(()=>{
                let cons = variant.properties.Consequence != null? variant.properties.Consequence : '';
                return cons;
              });
            spanCons.attr('class', ()=> variant.properties.Consequence);
            spanCons.classed('badge badge-info', true);

            text.append('h4').text('Associated Gene: '+ response.gene.name);

        }else if(command == 'Search GO'){
            console.log('go resp', command);
            let addbutton = head.append('button').classed('btn btn-outline-primary', true);
            addbutton.append('text').text('Add to Graph');
            addbutton.on('click', ()=> {
               // neoAPI.buildSubGraph(response.gene);
            });
         
            let text = queryBox.append('div');
            text.append('h3').text('Found for '+ value);
            text.append('h4').text(response.length+' returned');
            let entries = text.append('div').selectAll('.entry').data(response);
            let entEnter = entries.enter().append('div').classed('entry', true);
            let span = entEnter.append('span').text(d=> d.bioentity_label);
            span.classed('badge badge-info', true);
            entEnter.append('div').append('text').text(d=> d.bioentity_name);
            entEnter.append('div').append('text').text(d=> d.synonym[0]);
          //  text.append('h4').text('Type: '+ variant.type);

        }else{

        let closebutton = head.append('button').classed('close', true).attr('aria-label', "Close");
        closebutton.append('span').attr('aria-hidden', "true").append('text').text('x');
    
        closebutton.on('click', ()=> {
            d3.select('#graph-render').select('.query-box').remove();
        })
        let text = queryBox.append('div');
        text.append('h3').text('Not Found');
    }


}
}

export async function addFromGo(value:string){

    let url = 'http://api.geneontology.org/api/bioentity/function/'+value;

    
    let response = (async () => {
        try {
            let req = await ky.get(url).json();
            console.log('ret', req)
            return req;
        } catch (error) {
            console.log(error);
            let req = null;
            return req;
        }
    });

    return await response();

}

export async function testingSpace(value:string){

    console.log('testing space ',value);

}

export async function addVariant(d: string){
    
    let variantOb = new qo.VariantObject(d);
    variantOb.type = "Variant";
    let snp = await loadSNP(d);
    let ens = await loadEnsemble(d);

    variantOb.properties.Type = snp.variant_type;
    variantOb.properties.Location.anchor = snp.anchor? snp.anchor : 'null';
    variantOb.properties.Location.placements_with_allele = snp.placements_with_allele;
    variantOb.properties.allelleAnnotations = snp.allele_annotations;
    let clinicalSNP = snp.allele_annotations.filter(a=> a.clinical.length > 0);
    variantOb.properties.Phenotypes = clinicalSNP.map(f=> f.clinical);
    variantOb.properties.Ids.refsnp_id = snp.refsnp_id;

    variantOb.properties.Consequence = ens.most_severe_consequence ? ens.most_severe_consequence: null;
    variantOb.properties.Frequency = ens.MAF ? ens.MAF :  null;
 //   variantOb.properties.ens = ens? ens : null;
    variantOb.properties.synonyms = ens.synonyms? ens.synonyms: null;
    variantOb.properties.ambiguity = ens.ambiguity? ens.ambiguity: null;
    variantOb.properties.minor_allele = ens.minor_allele? ens.minor_allele : null;
    variantOb.properties.mappings = ens.mappings? ens.mappings[0]: null;
    variantOb.properties.class = ens.var_class? ens.var_class:null;
    variantOb.properties.ancestral_allele = ens.ancestral_allele? ens.ancestral_allele : null;

    let test = ens.synonyms.filter(f=> f.includes('.') && !f.startsWith("N"));
   
    let clin = await loadClinVar(test[0]);

  //  console.log(clin.result);
    let key = clin.result.uids[0];
  //  console.log(clin.result[key]);
    let clinvar = clin.result[key];

    variantOb.properties.OMIM = clinvar.uid;

    let newGene = new qo.GeneObject(null, 'Gene');
    newGene.properties.Ids.OMIM = clinvar.uid;
    let omimGene = await searchOMIM(newGene);

    omimGene.name = omimGene.properties.Symbols.split(',')[0];

    let newNode = await initialSearch(omimGene);

    console.log(newNode);


    return {'variant': variantOb, 'gene': omimGene};
}

export async function addGene(d: string){
    let geneOb = new qo.GeneObject(d, 'Gene');
    let newNode = await initialSearch(geneOb);
    return newNode;
}

export async function addPathway(d:string){
    let pathOb = new qo.PathwayObject(d);

    const proxy = 'https://cors-anywhere.herokuapp.com/';

    let url2 = 'http://rest.kegg.jp/link/pathway/' + d;

    let req2 =  await ky.get(proxy+ url2).text();

    console.log('pathway response', req2);

}

export async function initialSearch(queryOb: object){
   
    let idSearch = await searchBySymbol(queryOb);
    let mimId = await geneIdtoMim(idSearch);
    let omimOb = await searchOMIM(mimId);
    let kegg = await getKegg(omimOb.properties.Ids.ncbi, omimOb);
    let interact = await searchStringInteractors(kegg);

    let test = await searchEnsembl(interact);
    interact.properties.Biotype = test.biotype;
    interact.properties.Transcript = test.Transcript;

    let final = await searchGO(interact);

    return final;
}

export async function searchBySymbol(query:object) {

    const proxy = 'https://cors-anywhere.herokuapp.com/';
    let url = 'http://mygene.info/v3/query?q=';

    let req =  await got(proxy+'http://mygene.info/v3/query?q='+query.name);
  
    let json = JSON.parse(req.body);

    let idSearch = json.hits[0];
   
    let ids = { 'symbol': idSearch.symbol, 'ncbi': idSearch._id, 'entrezgene': idSearch.entrezgene, 'taxid': idSearch.taxid, 'description': idSearch.name };
    query.properties.Ids = ids
    query.properties.Description = idSearch.name;

    return query;
}

export async function searchGO(queryOb:object){
    let value = queryOb.properties.Ids.ncbi
    const proxy = 'https://cors-anywhere.herokuapp.com/';
    let url = 'http://api.geneontology.org/api/bioentity/gene/'+value+'/function/';

    let response = (async () => {
        try {
            let req = await ky.get(url).json();
            console.log('ret', req)
            return req;
        } catch (error) {
            console.log(error);
            let req = null;
            return req;
        }
    });

    let json = await response();

    let findings = json.associations.map(m=> m.object);

    queryOb.properties.GO = findings;
    return queryOb;


}

export async function searchEnsembl(queryOb:object){
    let value = queryOb.properties.Ids.Ensembl
    const proxy = 'https://cors-anywhere.herokuapp.com/';
    let url = 'https://rest.ensembl.org/lookup/id/'+value+'?expand=1;content-type=application/json';

    let response = (async () => {
        try {
            let req = await ky.get(url).json();
            console.log('ret', req)
            return req;
        } catch (error) {
            console.log(error);
            let req = null;
            return req;
        }
    });

    return await response();
}

export async function searchUniprot(value:string){
    //P29033
    let proxy = 'https://cors-anywhere.herokuapp.com/';
    //let url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id='+digits+'&retmode=json&apiKey=mUYjhLsCRVOuShEhrHLG_w'
   // 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id=328931&retmode=json&apiKey=mUYjhLsCRVOuShEhrHLG_w'
    let url = 'https://www.uniprot.org/uniprot/'+value+'.xml';

   // let req = await ky.get(url);
   let req =  await got(proxy+url);

}

export async function loadClinVar(value:string){
    let proxy = 'https://cors-anywhere.herokuapp.com/';
    console.log(value);
    let url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id='+value+'&retmode=json'
    //'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=clinvar&rettype=clinvarset&id='+value
    let response = (async () => {
        try {
            let req = await ky.get(url).json();
          //  console.log('ret', req)
            return req;
        } catch (error) {
            console.log(error);
            let req = null;
            return req;
        }
    });

    return await response();
}

export async function loadSNP(value: string){
    
    let query = value.includes(',') ? value.split(',')[0] : value;
    let digits = query.replace(/\D/g,'');
    let proxy = 'https://cors-anywhere.herokuapp.com/';
    //let url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id='+digits+'&retmode=json&apiKey=mUYjhLsCRVOuShEhrHLG_w'
   // 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id=328931&retmode=json&apiKey=mUYjhLsCRVOuShEhrHLG_w'
    let url = 'https://api.ncbi.nlm.nih.gov/variation/v0/beta/refsnp/' + digits;

    let response = (async () => {
        try {
            let req = await ky.get(url).json();
            let resp = req.primary_snapshot_data;
            resp.refsnp_id = req.refsnp_id;
            return resp;
        } catch (error) {
            let req = null;
            return req;
        }
    });

    return await response();
}

export async function loadEnsemble(value:string){
    let query = value.includes(',') ? value.split(',')[0] : value;
    let proxy = 'https://cors-anywhere.herokuapp.com/';
    let url = 'https://rest.ensembl.org/variation/human/'+query+'?content-type=application/json';
    let response = (async () => {
        try {
            let req = await ky.get(url).json();
            return req;
        } catch (error) {
            let req = null;
            return req;
        }
    });

    return await response();
    
}

export async function searchOMIMPheno(queryOb:any){
   
    let value = queryOb.name;
    const proxy = 'https://cors-anywhere.herokuapp.com/';
    let url = 'https://api.omim.org/api/entry?mimNumber='+value+'&include=all&format=json&apiKey=mUYjhLsCRVOuShEhrHLG_w';
    let req =  await got(proxy+url);
    let json = JSON.parse(req.body);

    let omim = json.omim.entryList[0].entry;

  //  console.log('omim',omim);

    queryOb.properties.inheritance = omim.clinicalSynopsis.inheritance;
    queryOb.properties.Ids = {};
    queryOb.properties.Ids.diseaseOntologyIDs = omim.externalLinks.diseaseOntologyIDs;// "0110563"
    queryOb.properties.Ids.geneticAllianceIDs = omim.externalLinks.geneticAllianceIDs;
    queryOb.properties.Ids.geneticsHomeReferenceIDs = omim.externalLinks.geneticsHomeReferenceIDs;
    queryOb.properties.Ids.nbkIDs = omim.externalLinks.nbkIDs;//: "NBK1434;;Hereditary Hearing Loss and Deafness Overview"
    queryOb.properties.Ids.orphanetDiseases =omim.externalLinks.orphanetDiseases;// "90635;;12046;;Autosomal dominant non-syndromic sensorineural deafness type DFNA"
    queryOb.properties.Ids.swissProtIDs = omim.externalLinks.swissProtIDs;//: "Q8TDI8"
    queryOb.properties.Ids.umlsIDs = omim.externalLinks.umlsIDs;//: "C1847626"

    queryOb.properties.Text = omim.textSectionList.map(t=> t.textSection);

   // console.log(queryOb);

    return await queryOb;
}

export async function searchOMIM(queryOb:any){

    let searchValue = queryOb.properties.Ids.OMIM
    const proxy = 'https://cors-anywhere.herokuapp.com/';
    let url = "https://api.omim.org/api/entry?mimNumber="+searchValue+"&include=text&include=allelicVariantList&include=clinicalSynopsis&include=referenceList&include=geneMap&format=json&apiKey=mUYjhLsCRVOuShEhrHLG_w";
    let req =  await got(proxy+url);
    let json = JSON.parse(req.body);

    let omim = json.omim.entryList[0].entry;

    console.log('omim',omim);

    //add these more dynamically
    queryOb.properties.Variants = omim.allelicVariantList ? omim.allelicVariantList.map(p=> p['allelicVariant']): null;
    queryOb.properties.Titles = omim.titles;

    queryOb.properties.Location = 
    {'chromosome':omim.geneMap.chromosome, 
    'chromosomeStart':omim.geneMap.chromosomeLocationStart, 
    'chromosomeEnd':omim.geneMap.chromosomeLocationEnd,
    'chromosomeSort': omim.geneMap.chromosomeSort,
    'computedCytoLocation': omim.geneMap.computedCytoLocation,
    'cytoLocation': omim.geneMap.cytoLocation
    };

    queryOb.properties.References = omim.referenceList.map(p=> p.reference);
    queryOb.properties.Text = omim.textSectionList.map(p=> p.textSection);
    queryOb.properties.Models.mouse = {'MgiID': omim.geneMap.mouseMgiID, 'symbol': omim.geneMap.mouseGeneSymbol };
    queryOb.properties.Phenotypes.nodes = omim.geneMap.phenotypeMapList;
    queryOb.properties.Ids.sequenceID = omim.geneMap.sequenceID;
    queryOb.properties.transcript = omim.geneMap.transcript;
    queryOb.properties.Titles = omim.titles
    queryOb.properties.Symbols = omim.geneMap.geneSymbols;
    queryOb.properties.Transcript = omim.geneMap.transcript;
    queryOb.properties.mappingMethod = omim.geneMap.mappingMethod;

   return queryOb;
}
export async function geneIdtoMim(query:any){
 
    let value = query.properties.Ids.entrezgene;

    const proxy = 'https://cors-anywhere.herokuapp.com/';
    let url = 'http://mygene.info/v2/gene/'+value+'?fields=MIM';
          
    let req =  await got(proxy+url);
    let json = JSON.parse(req.body);
    let props = json;
    query.properties.Ids.OMIM = props.MIM;
    
    return query;
    //return props;
}

export async function searchStringInteractors(node:object){

    const proxy = 'https://cors-anywhere.herokuapp.com/';
    let url = 'https://string-db.org/api/json/interaction_partners?identifiers='+ node.name +'&limit=20';
    let req =  await ky.get(proxy+url).json();

    node.properties.Ids.stringID = req[0].stringId_A;
               
    let interactionNodes = req.map(m => {
        let ob = {'name' : m.preferredName_B, 'type': 'Interaction', 'properties': { 'Ids': {}, 'Metrics': {} } };
        ob.properties.Ids.stringID = m.stringId_B;
        ob.properties.Source = m.preferredName_A;
        ob.properties.Metrics = d3.entries(m).filter(f=> f.key.includes('score'))
        return ob;
    });

    node.properties.InteractionPartners = interactionNodes;


    return node;
}

export async function searchStringEnrichment(value:string){

    const proxy = 'https://cors-anywhere.herokuapp.com/';
    let url = 'https://string-db.org/api/json/enrichment?identifiers='+value;

    let url2 = 'http://string-db.org/api/json/network?identifier=gjb2&limit=10&network_flavor=evidence%20Additional%20information%20about%20the%20API'

    let req =  await ky.get(proxy+url).json();
    let req2 = await ky.get(proxy+url2).json();                                                                                                                 

    return req;
}

export async function getKegg(value: string, queryOb:object){
  
   // let ncbi = queryOb.properties.ncbi;
    let req =  await ky.get('https://cors-anywhere.herokuapp.com/http://rest.kegg.jp/conv/genes/ncbi-geneid:'+value).text();
  
    let parsed = req.split(/(\s+)/).filter(d=> d.includes('hsa'));

    let req2 =  await ky.get('https://cors-anywhere.herokuapp.com/http://rest.kegg.jp/get/'+parsed[0]).text();

    let data = req2.split(/\r?\n/)
    data.map(d=> d.split(' '));
  
    function structureResponseData(oldIndex, dataArray){
        let key = [];
        let keyIndex = oldIndex;
        let test = []
        
        dataArray.forEach((ob, i)=> {
            if(ob.startsWith(' ')){
                key.push(ob)//.filter(o=> o != ""))
            }else{
                key = [ob]//.filter(o=> o != "")
                keyIndex = i
                test.push(key);
            }
        });

        let newData = test.map(row=> {
            let keyz = row[0].split(/\b/)[0];
            let val = row.map(r=> r.split(/\s+/).filter(f=> f != "" && f != keyz))
            return {key: keyz, values: val}
        });

        return newData.filter(n=> n.key != "///" && n.key != "");
    }

    let keggData = await structureResponseData(0, data);

    console.log('keggData',keggData);

    if(keggData.filter(d=> d.key == "DISEASE").length > 0){

        let diseases = keggData.filter(d=> d.key == "DISEASE").map(f=> f.values)[0];

        let matchDis = diseases.map(d=> {
            let keggId = d[0];
            let stringId = [];
            for(let i = 1; i < d.length; i++){
                stringId.push(d[i]);
            }
            return {'keggId': keggId, 'stringId': stringId};
        });

        queryOb.properties.Phenotypes.keggIDs = matchDis;
    }
    

    let keggOrthoID = keggData.filter(d=> d.key == "ORTHOLOGY").map(f=> f.values)[0];
    let keggBrite = keggData.filter(d=> d.key == "BRITE").map(f=> f.values)[0];
    let dbLinks = keggData.filter(d=> d.key == "DBLINKS").map(f=> f.values)[0];
    let AASEQ = keggData.filter(d=> d.key == "AASEQ").map(f=> f.values)[0];
    let NTSEQ = keggData.filter(d=> d.key == "NTSEQ").map(f=> f.values)[0];
    let STRUCTURE = keggData.filter(d=> d.key == "STRUCTURE").map(f=> f.values)[0];
    let MOTIF = keggData.filter(d=> d.key == "MOTIF").map(f=> f.values)[0];

    dbLinks.map(d=> {
        let key = d[0].slice(0, -1);
        let value = d[1];
        return {'key': key, 'value': value};
    }).forEach(el => {
        queryOb.properties.Ids[el.key] = el.value;
    });

    
    queryOb.properties.Orthology.keggID = keggOrthoID? keggOrthoID[0][0]: null;
    queryOb.properties.Brite.kegg = keggBrite? keggBrite: null;
    queryOb.properties.Structure.AASEQ = AASEQ;
    queryOb.properties.Structure.NTSEQ = NTSEQ;
    queryOb.properties.Structure.ids = STRUCTURE;
    queryOb.properties.Structure.MOTIF = MOTIF;

    queryOb.properties.Brite = queryOb.properties.Brite.kegg != null? queryOb.properties.Brite.kegg.map(b=>{
        if(b[0].match(/\d/)){
            let tag = b.slice(1, (b.length))
            if(tag.length > 1){
                return {'id': b[0], 'tag': tag.reduce((a, c)=> a.concat(' '+c)) }
            }else{return {'id': b[0], 'tag': tag } }
            
        }else{
            let tag = b.slice(0, (b.length - 1));
            if(tag.length > 1){
                return {'id': b[b.length - 1], 'tag': tag.reduce((a, c)=> a.concat(' '+c)) }
            }else{return {'id': b[0], 'tag': tag } }
        }
    }) : null;


    return queryOb;
}

export async function linkData(ob1, ob2){

    let namesToMatch = ob1.map(p=> {
        p.phenotype.toUpperCase()
    });
    let namesToCheck = ob2.map(v=> v.description);

}

//Formater for CONVERT. Passed as param to query
export async function getPathways(queryOb) {

    let value = queryOb.properties.ids.ncbi;

    let proxy = 'https://cors-anywhere.herokuapp.com/';
    let url = 'http://rest.kegg.jp/conv/genes/ncbi-geneid:'+value;

    let req =  await ky.get('https://cors-anywhere.herokuapp.com/http://rest.kegg.jp/conv/genes/ncbi-geneid:'+value).text();

    let idstring:Array<string> = await grabId('ncbi-geneid', req);

    let keggId = null;

    keggId = (idstring.length > 1) ? idstring[1] : idstring[0];

    let url2 = 'http://rest.kegg.jp/link/pathway/' + keggId;

    let req2 =  await ky.get(proxy+ url2).text();

}



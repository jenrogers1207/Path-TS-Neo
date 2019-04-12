import "./styles.scss";
import * as d3 from 'D3';
import * as search from './search';
import * as qo from './queryObject';
import { BaseType, select, geoIdentity } from "D3";
const neoAPI = require('./neo4jLoader');
const app = require('./app');
const gCanvas = require('./graphRender');

export function removeThings(){
    d3.select('#linked-pathways').selectAll('*').remove();
    d3.select('#pathway-render').selectAll('*').remove();
    d3.select('#assoc-genes').selectAll('*').remove();
    d3.select('#gene-id').selectAll('*').remove();
}

export async function changeSelectedClasses(dataArray: Array<object>){
    let selected = dataArray.map(m=> m.name);
    d3.select('body').selectAll('.selected').classed('selected', false);
    d3.select('.call-table')
}

export function viewToggleInput(){
    let dropData = ['Whole Network', 'Align by Gene', 'Align by Phenotype']
    let dropdown = d3.select('#topnav').select('.dropdown');
    let dropButton = dropdown.select('.dropdown-toggle');
    dropButton.text(dropData[0]);
    let dropdownItems = dropdown.select('.dropdown-menu').selectAll('.dropdown-item').data(dropData);
    let dropEnter = dropdownItems.enter().append('a').classed('dropdown-item', true);
    dropEnter.attr('href', '#');
    dropEnter.text(d=> d);
    dropdownItems.merge(dropEnter);

    return dropdown;
}

export async function renderCalls(promis: Array<object>, selectedNode:Array<object>, graphArray:any){

      //  let selectedNames = qo.selected.queryKeeper.map(k=> k.name);
        let selectedNames = selectedNode.map(k=> k.name);

        console.log('in toolbar',selectedNode,promis, graphArray[0].nodes.filter(f=> f.label.includes('Gene')));//
        let geneProm = graphArray[0].nodes.filter(f=> f.label.includes('Gene')).map(g=> qo.structGene(g));
        //let geneNode = await Promise.all(geneProm);

       // let data = await Promise.all(promis);
       let data = await Promise.all(geneProm);

        let sidebar = d3.select('#left-nav');
        let callTable = sidebar.select('.call-table');

        callTable.selectAll('*').remove();

        let geneDiv = callTable.selectAll('.gene').data(data);
        geneDiv.exit().remove();

        let geneEnterDiv = geneDiv.enter().append('div').attr('class', d=> d.value).classed('gene', true);
        let geneHeader = geneEnterDiv.append('div').classed('gene-header', true);

        geneHeader.append('text').text(d=> d.name);

        let geneIcon = geneHeader.append('i').attr('class', d=> d.name);
        geneIcon.classed('fas fa-chevron-circle-down', true);

        let selectIcon = geneHeader.append('i').attr('class', "fas fa-binoculars");

        selectIcon.on('click', async function(d){
           
            let graph = await neoAPI.getGraph();
            qo.selected.addQueryOb(d);
            let selected = qo.selected.queryKeeper.map(d=> d)[qo.selected.queryKeeper.length - 1];
            renderGeneDetail([selected], graph);
            gCanvas.graphRenderMachine(graph[0], [selected]);
            renderCalls(promis, [selected], graphArray);
        });
    
        geneIcon.on('click', function(d){
          let header:any = this.parentElement.nextSibling;
          d3.select(header).classed('hidden')? d3.select(header).classed('hidden', false) : d3.select(header).classed('hidden', true);
          let icon =  d3.select(this.parentElement).select('i.'+d.name);
          icon.classed('fa-chevron-circle-down') ? icon.attr('class', d.name+' fas fa-chevron-circle-up') : icon.attr('class', d.name+' fas fa-chevron-circle-down');
        });

        geneDiv = geneEnterDiv.merge(geneDiv);

        geneDiv.filter(d=> selectedNames.includes(d.name)).classed('selected', true);

        let variantBox = geneDiv.append('div').classed('variant-wrapper', true);
    
        let variants = variantBox.selectAll('.variant').data((dat)=> {
           
            if(dat.properties.Variants != undefined){
                return dat.properties.Variants.map(d=>{ 
                    if(d.properties.Phenotypes[0] != undefined){
                        d.tag = d.properties.Phenotypes[0][0].clinical_significances? d.properties.Phenotypes[0][0].clinical_significances: null;
                    }else{
                        d.tag = [''];
                    }
                   
                    d.cons = d.properties.Consequence ? d.properties.Consequence : null;
                    return d;
                });
                
            }else return [];
    
        });
        variants.exit().remove();
        let varEnter = variants.enter().append('div').classed('variant', true);
        let varHead = varEnter.append('div').attr('class', d=> d.name).classed('var-head', true)//.append('h5').text(d=>d.name);
        let varText = varHead.append('h5').text(d=>d.name);
        let varIcon = varHead.append('i').attr('class', d=> d.name);
        varIcon.classed('fas fa-chevron-circle-down', true);
        let spanType = varHead.append('span').text(d=> d.properties.Type);
        spanType.classed('badge badge-info', true);
        let spanTag = varHead.append('span').text(d=> d.tag[0]);
        spanTag.classed('badge badge-warning', true);
        let spanCons = varHead.append('span').text(d=> {
            let cons = d.cons != null? d.cons : '';
            return cons;
        });
        spanCons.attr('class', d=> d.cons);
        spanCons.classed('badge badge-info', true);
   
        varHead.on('click', function(d){
            let text = this.nextSibling;
            d3.select(text).classed('hidden')? d3.select(text).classed('hidden', false) : d3.select(text).classed('hidden', true);
            let icon =  d3.select(this).select('i.'+d.name);
            icon.classed('fa-chevron-circle-down') ? icon.attr('class', d.name+' fas fa-chevron-circle-up') : icon.attr('class', d.name+' fas fa-chevron-circle-down');
        });

        let varDes = varEnter.append('div').classed('var-descript', true).classed('hidden', true);
        let blurbs = varDes.selectAll('.blurb').data(d=>{
            
                let blurbin = {}
                blurbin.Class = d.properties.class;
                blurbin.Consequence = d.properties.Consequence;
                //blurbin.Ids = d.properties.Ids;
                //blurbin.Type = d.properties.Type;
                blurbin.Ambiguity = d.properties.ambiguity;
                blurbin['Ancestral Allele'] = d.properties.ancestral_allele;
                blurbin['Minor Allele'] = d.properties.minor_allele;       
                blurbin['Assembly Name'] = d.properties.mappings? d.properties.mappings.assembly_name: null;
                blurbin.Frequency =  d.properties.Frequency;
                blurbin.Names = d.properties.synonyms? String(d.properties.synonyms).split(',') : [];
                blurbin.Mutations = d.properties.mutations;
                blurbin.Location = d.properties.Location;
                // blurbin.Structure = d.properties.Structure;
                 blurbin.Phenotypes = d.properties.Phenotypes;

                blurbin.Location['Chromosome Location'] = d.properties.mappings? d.properties.mappings.location: null;
                
                blurbin['Allele Annotations'] = d.properties.allelleAnnotations;

                blurbin.Text = d.properties.Text;

                
                return d3.entries(blurbin);
                })
                .enter().append('div').classed('blurb', true);

        let shortBlurbs = ['Class', 'Consequence', 'Ambiguity', 'Ancestral Allele', 'Minor Allele', 'Assembly Name', 'Frequency'];

        let blurbShort = blurbs.filter(d=> shortBlurbs.includes(d.key)).classed('short', true);
        let blurbShortHead = blurbShort.append('div').classed('var-blurb head-short', true);
        blurbShortHead.append('span').append('text').text(d=> d.key + ': ');
        blurbShortHead.append('text').text(function(d) { return d.value == null? 'Unknown' : String(d.value);});

        let blurbLong = blurbs.filter(d=> shortBlurbs.indexOf(d.key)== -1);
        let blurbLongHead = blurbLong.append('div').classed('var-blurb head-long', true);
        blurbLongHead.append('span').append('text').text(d=> d.key + ': ');

        let blurbNames = blurbLong.filter(d=> d.key =='Names').selectAll('.var-names').data(d=> d.value).enter().append('div').classed('var-names var-blurb-body', true);
        blurbNames.append('text').text(d=> d);

        let locBlurb = blurbLong.filter(d=> d.key == 'Location').selectAll('.val-loc').data(d=> d3.entries(d.value)).enter().append('div').classed('var-loc', true);
        locBlurb.append('text').text(d=> d.key+': '+d.value);

        let blurbPheno = blurbLong.filter(d=> d.key =='Phenotypes').selectAll('.var-p').data(d=> d.value).enter().append('div').classed('var-p var-blurb-body', true);
        let span = blurbPheno.append('span').append('text').text(d=> d[0].clinical_significances[0])
        span.classed('badge badge-warning', true);
        let phenoTypes = blurbPheno.selectAll('.pheno-types').data(d=>{
            return d}).enter().append('div').classed('pheno-types', true);
        phenoTypes.append('text').text(d=> d.disease_names[0]);

        let textBlurb = blurbLong.filter(d=> d.key == 'Text' || d.key == 'Mutations').append('div').classed('var-text', true);
        textBlurb.append('text').text(d=> d.value);

        variants = varEnter.merge(variants);
  
        variants.on('mouseover', function(d){
           let matches = d3.selectAll('.'+d.name);
           matches.classed('highlight', true);
        });
          
        variants.on('mouseout', function(d){
            let matches = d3.selectAll('.highlight');
            matches.classed('highlight', false);
         });

        let unselectedGenes = geneDiv.filter(d=> selectedNames.indexOf(d.name) == -1);

        unselectedGenes.select('.variant-wrapper').classed('hidden', true);
}
export async function renderGeneDetail(dataArray: Array<object>, graph:object){
    
    let data = dataArray[0];
    
    let headers = d3.keys(data.properties).filter(d=> d != 'References' && d !='Variants'  && d != 'name');

    let sidebar = d3.select('#left-nav');
    let geneDet = sidebar.select('.gene-detail');
    geneDet.selectAll('*').remove();
    let geneHeader = geneDet.append('div').attr('class', 'detail-head').append('h4').text(data.name);
  
   // let symbolBand = geneDet.append('div').classed('symbols', true).data(JSON.parse(data.Symbols));
    let propertyDivs = geneDet.selectAll('.prop-headers').data(headers);
    let propEnter = propertyDivs.enter().append('div').classed('prop-headers', true);
    let propHead = propEnter.append('div').attr('class', (d)=> d).classed('head-wrapper', true);
    propHead.append('h5').text((d)=> d.toUpperCase());
    propHead.append('i').attr('class', (d)=> d+' fas fa-chevron-circle-up');
    propEnter.append('div').attr('class', (d)=> d+' detail-wrapper');

    propHead.on('click', function(d){
        d3.select(this.nextSibling).classed('hidden')? d3.select(this.nextSibling).classed('hidden', false) : d3.select(this.nextSibling).classed('hidden', true);
        let icon =  d3.select(this).select('i.'+d);
        icon.classed('fa-chevron-circle-down') ? icon.attr('class', d+' fas fa-chevron-circle-up') : icon.attr('class', d+' fas fa-chevron-circle-down');

    });

    let ids = propEnter.filter(d=> d == 'Ids').select('.detail-wrapper').selectAll('.ids').data(d=> d3.entries(data.properties[d]));
    let idEnter = ids.enter().append('div').classed('ids', true);
   // let idsSec = idEnter.append('text').text(d=> d.key + ': ' + d.value);
    idEnter.append('span').append('text').text(d=> d.key + ': ');
    idEnter.append('text').text(d=> d.value);

    let location = propEnter.filter(d=> d == "Location").select('.detail-wrapper').selectAll('.location').data(d=> d3.entries(data.properties[d]));
    let locEnter = location.enter().append('div').classed('location', true);
    locEnter.append('span').append('text').text(d=> d.key + ': ');
    locEnter.append('text').text(d=> d.value);
  
    if(data.properties.Phenotypes.length > 0){
        let phenotype = propEnter.filter(d=> d == "Phenotypes").select('.detail-wrapper').selectAll('.pheno-wrap').data(d=> {
                let phenoD = data.properties[d].map(p=> p.properties).filter(p=> {
                    return JSON.parse(p.properties).associatedGene == data.name});
                return phenoD;
        });
        let phenoEnter = phenotype.enter().append('div').classed('pheno-wrap', true);
        let phenoSec = phenoEnter.append('text').text(d=> {   
          
            let descript = typeof d.properties == 'string'? JSON.parse(d.properties) : d.properties;
                return descript.description});
    }
   

    let titles = propEnter.filter(d=> d == "Titles").select('.detail-wrapper').selectAll('.title').data(d=> {return d3.entries(data.properties[d])});
    let titleEnter = titles.enter().append('div').classed('title sections', true);
    titleEnter.append('text').text(d=> d.value);

    let models = propEnter.filter(d=> d == "Models").select('.detail-wrapper').selectAll('.des').data(d=> {
        //console.log('models',d);
        return d3.entries(data.properties[d])});
    let modEnter = models.enter().append('div').classed('des', true);
    modEnter.append('text').text(d=> d.key + ": " + JSON.stringify(d.value));

    let biotype = propEnter.filter(d=> d == "Biotype").select('.detail-wrapper');
    let bioEnter = biotype.append('div').classed('des', true);
    bioEnter.append('text').text(d=> data.properties[d]);

    let gos = propEnter.filter(d=> d == "GO").select('.detail-wrapper').selectAll('.des').data(d=> {
        console.log('b',d);
        return data.properties[d]});
    let goEnter = gos.enter().append('div').classed('des', true);
    goEnter.append('span').append('text').text(d=> d.label + ': ');
    goEnter.append('text').text(d=> d.id);

    let textProp = propEnter.filter(d=> d == 'Text').select('.detail-wrapper').selectAll('.text').data(d=> {return data.properties[d]});
    let textEnter = textProp.enter().append('div').classed('text', true);
    let headText = textEnter.append('div').classed('text-sec-head', true).append('h5').text(d=> d.textSectionTitle + ': ');
    let textDiv = textEnter.append('div').classed('textbody', true);
    textDiv//.classed('hidden', true);
    let textText = textDiv.append('text').text(d=> d.textSectionContent);

    headText.on('click', function(d) {
       // let text = this.parentNode.nextSibling
       // console.log(text)
       // textDiv.classed('hidden')? d3.select(text).classed('hidden', false) : d3.select(text).classed('hidden', true);
    });

    let descript = propEnter.filter(d=> d == "Description").select('.detail-wrapper').append('div').append('text').text(d=> data.properties[d]);
    let symbols = propEnter.filter(d=> d == "Symbols").select('.detail-wrapper').append('div').append('text').text(d=> data.properties[d]);

    let structure = propEnter.filter(d=> d == "Structure").select('.detail-wrapper').selectAll('.structure').data(d=> {
        return d3.entries(data.properties[d])});
    let structEnter = structure.enter().append('div').classed('structure', true);
    structEnter.append('text').text(d=> d.key+ ': ' + d.value);

    let orthology = propEnter.filter(d=> d == "Orthology").select('.detail-wrapper').selectAll('.orthology').data(d=> {return d3.entries(data.properties[d])});
    let orthoEnter = orthology.enter().append('div').classed('orthology', true);
    orthoEnter.append('text').text(d=> d.key+ ': ' + d.value);

    let brite = propEnter.filter(d=> d == "Brite").select('.detail-wrapper').selectAll('.brite').data(d=> {return data.properties[d]});
    let briteEnter = brite.enter().append('div').classed('brite', true);
    briteEnter.append('text').text(d=> d.id+ ': ' + d.tag );

    let interactors = propEnter.filter(d=> d == "InteractionPartners").select('.detail-wrapper').selectAll('.interact').data(d=> {return data.properties[d]});
    let intEnter = interactors.enter().append('div').classed('interact', true);
    intEnter.append('text').text(d=> d.name);
    let addIcon = intEnter.append('i').attr('class', "fas fa-search-plus");
    addIcon.on('click', async function(d){

        //THIS IS ADDING THE INTERRACTORAS A NEW GENE

        let newNode = await search.addGene(d.name);
      
        app.isStored(graph, newNode).then(async(n)=>{

            let varAlleles = await app.variantObjectMaker(n.properties.Variants);
            let variants = await qo.structVariants(varAlleles);
            n.properties.Variants = variants;

            if(n.properties.Phenotypes.nodes != undefined){
                let structuredPheno = await qo.structPheno(n.properties.Phenotypes, n.name);
                n.properties.Phenotypes.nodes = structuredPheno;
            }
           
          //  let enrighmentP = await search.searchStringEnrichment(n.name);
            neoAPI.buildSubGraph(n);

            let newGraph = await neoAPI.getGraph();
           
        });
    });

    propertyDivs = propEnter.merge(propertyDivs);

}

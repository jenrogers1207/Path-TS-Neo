import "./styles.scss";
import * as d3 from 'D3';
const gCanvas = require('./graphRender');
var neoAPI = require('./neo4jLoader');
var search = require('./search');
var dataLoad = require('./fileDataLoad');
const qo = require('./queryObject');
const toolbar = require('./toolbarRender');

let canvas = d3.select('#graph-render').append('svg').classed('graph-canvas', true);
let linkGroup = canvas.append('g').classed('links', true);
let nodeGroup = canvas.append('g').classed('nodes', true);
let toolDiv = d3.select('body').append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
//let queryPanel = d3.select('#wrapper').append('div').attr('id', 'query-panel');

toolbar.viewToggleInput();


export function searchToggleInput(){
   let data = ['Search Gene', 'Search GO',/*'Search Function', 'Search Pathway', 'Search Models',*/ 'Search Variant'];

   let searchbar = d3.select('#topnav').select('.input-group.search');

   searchbar.select('.input-group-append').select('button').text(data[0]);

   let searchItems = searchbar.select('.dropdown-menu').selectAll('.dropdown-item').data(data);
   let searchEnter = searchItems.enter().append('a').classed('dropdown-item', true)
   searchEnter.text(d=> d);
   searchEnter.attr('href', '#');

   searchItems.merge(searchEnter);

   searchEnter.on('click', (d, i, g)=> {
    
    searchbar.select('.input-group-append').select('button').text(d);
    });

    searchbar.select('.input-group-append').select('.btn.btn-outline-secondary').on('click', (d, i, g)=>{
        let value = searchbar.select('input.form-control').node().value;
        search.searchMachine(d3.select(g[0]).text(), value);
    });

}

searchToggleInput();

dataLoad.loadFile().then(async (d)=> {

    let geneOb = new qo.GeneObject(d[0].key, 'Gene');
    geneOb.type = "Gene";

    let fileVariants = await variantObjectMaker(d[0].values, geneOb.name);
    let graphArray = await neoAPI.getGraph();//.then(g => {

    if(graphArray[0].nodes.length != 0 && graphArray != undefined){
        
        let graph = graphArray[0];

        let queryGenes = graph.nodes.filter(f=> f.label.includes('Gene'));

        console.log('query genes', queryGenes);
    
        let queryKeeper = queryGenes.map(async (gene:object) => {
            let ob = isStored(graph, gene);
            qo.allQueries.addQueryOb(ob);
            return ob;
        });

        let graphVariants = graph.nodes.filter(d=> d.label == 'Variant');

        //adding selectednode as the file gene
        let selectedGene = await Promise.resolve(queryKeeper[0]);
        qo.selected.addQueryOb(selectedGene);
        
        let variants = await updateVariants(fileVariants, graphVariants);
        
        let variantOb = await Promise.resolve(variants);

        selectedGene.properties.Variants = variantOb.filter(v=> v.properties.associatedGene == selectedGene.name);

        let graphPhenotypes = graph.nodes.filter(d=> d.label == 'Phenotype');

        queryKeeper.forEach(query => {
            checkPhenoTypes(graphPhenotypes, query);
        });

        async function checkPhenoTypes(graphPheno, queryOb){

            let  gene = await Promise.resolve(queryOb);
            let nodePheno = gene.properties.Phenotypes.nodes? gene.properties.Phenotypes.nodes : gene.properties.Phenotypes;

            let graphNames = graphPheno.map(m=> m.name);
            let newNodes = nodePheno.filter(f=> graphNames.indexOf(f.name) == -1);

            if(newNodes.length > 0){
                neoAPI.addNodeArray(newNodes).then(()=> { 
                neoAPI.structureRelation(newNodes, gene.properties.Variants, "Pheno");
             })
            }
        }

        let phenotypes = graphPhenotypes.length > 0? graphPhenotypes : await qo.structPheno(selectedGene.properties.Phenotypes, selectedGene.name);
      
        selectedGene.properties.Phenotypes = phenotypes;

      //  let enrighmentP = search.searchStringEnrichment(selectedGene.name);

        let graphInteraction = graph.nodes.filter(d=> d.label == 'Interaction');
      
        selectedGene.properties.InteractionPartners = graphInteraction.map(int=> {
            int.properties = int.properties.properties? JSON.parse(int.properties.properties) : int.properties;
            return int;
        });

        let dropdown = d3.select('#topnav').select('.dropdown');
        let dropButton = dropdown.select('.dropdown-toggle');
      //  neoAPI.buildSubGraph(selectedGene);
        dropdown.select('.dropdown-menu').selectAll('.dropdown-item').on('click', (d, i, g)=> {
            dropButton.text(d);
            let selected = qo.selected.queryKeeper.map(d=> d)[qo.selected.queryKeeper.length - 1];qo.selected.queryKeeper.map(d=> d);
            gCanvas.graphRenderMachine(graph, [selected]);
        })

        gCanvas.graphRenderMachine(graph, [selectedGene]);
        toolbar.renderCalls(queryKeeper, [selectedGene]);
        toolbar.renderGeneDetail([selectedGene], graph);
  
        }else{
       
            search.initialSearch(geneOb).then(async no=> {
            
                let varAlleles = await variantObjectMaker(no.properties.Variants, no.name);
          
                let variants = await updateVariants(fileVariants, varAlleles);
                no.properties.Variants = await Promise.all(variants);

               // console.log('in app', variants);

                let structuredPheno = await qo.structPheno(no.properties.Phenotypes, no.name);
                no.properties.Phenotypes.nodes = structuredPheno;

                let enrighmentP = await search.searchStringEnrichment(no.name);
    
                neoAPI.buildSubGraph(no).then(()=> {



                    neoAPI.getGraph().then(async (g)=> {

                        let graph = g[0];
                        let graphVariants = graph.nodes.filter(d=> d.label == 'Variant');

                        let queryGenes = graph.nodes.filter(f=> f.label.includes('Gene'));
    
                        let queryKeeper = queryGenes.map(async (gene:object) => {
                            let ob = isStored(graph, gene);
                            qo.allQueries.addQueryOb(ob);
                            return ob;
                        });

                          //adding selectednode as the file gene
                        let selectedGene = await Promise.resolve(queryKeeper[0]);

                        console.log('selected', selectedGene)

                       
                        qo.selected.addQueryOb(selectedGene);

                        gCanvas.graphRenderMachine(graph, [selectedGene]);
                        toolbar.renderCalls(queryKeeper, [selectedGene]);
                        toolbar.renderGeneDetail([selectedGene], graph);

                    });



                });


        });
    }
});

export async function variantObjectMaker(varArray: Array<object>, geneName:string){
  
    let varObs = typeof varArray == 'string'? JSON.parse(varArray): varArray;
    
      return varObs != null ? varObs.map(v=> {
       
          let name = v.id? v.id : v.dbSnps;
          let variant = new qo.VariantObject(name);
          variant.type = "Variant";
          
          let keys = v.properties? Object.keys(v.properties) : Object.keys(v);

          keys.map(key=> {
              variant.properties[key.toString()] = v[key];
          });

          variant.properties.associatedGene = geneName;
          variant.properties.description = variant.name;
          variant.properties.Ids.dbSnp = name;
          return variant
      }) : null;
  }

export async function isStored(graph: object, data:object){

   // let names = qo.allQueries.queryKeeper.map(k=> {return  k.name });

    let foundGraphNodes = graph.nodes.filter(n=> n.name == data.name);

    let nodeOb = foundGraphNodes.length > 0 ? labelsMatch(foundGraphNodes[0], data) : await search.initialSearch(data);

    let structuredOb = await qo.structGene(nodeOb);

    return await structuredOb;

    async function labelsMatch(graphNode:object, newNode:object){
        let type = newNode.type? newNode.type : newNode.label;
        let node = graphNode.label == type? graphNode : neoAPI.addLabel(newNode);
        return await node;
    }
}

async function updateVariants(fileVarArr:Array<Object>, graphVarArr: Array<any>){
   
    let graphVars = typeof graphVarArr == 'string'? JSON.parse(graphVarArr) : graphVarArr;
    let variantNames = graphVars.map(v=> v.name);
    let newVars = fileVarArr.filter(v=> variantNames.indexOf(v.name) == -1);

   // let unique = await findCopies(graphVars);

    let toStruct = await addIn(newVars, await findCopies(graphVars));
  //  let structured = await Promise.all(qo.structVariants(toStruct))

    return await Promise.resolve(qo.structVariants(toStruct));


    async function findCopies(nodeArray){
        let uniqueNameArray = []
        let uniqueVar = []

        await nodeArray.forEach(v => {
            if(uniqueNameArray.indexOf(v.name) == -1){
                uniqueNameArray.push(v.name);
                uniqueVar.push(v);
            }
        });
        return uniqueVar;
    }
        
    async function addIn(newArray:Array<Object>, oldArray:Array<Object>){
        if(newArray.length > 0){ newArray.forEach(v=> oldArray.push(v)) }
  
       // return qo.structVariants(oldArray);
       return oldArray;
    }

}
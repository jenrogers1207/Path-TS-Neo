import "./styles.scss";
import * as d3 from 'D3';
import { QueryObject, VariantObject } from "./queryObject";
import { searchOMIM } from "./search";
const gCanvas = require('./graphRender');
var neoAPI = require('./neo4jLoader');
var search = require('./search');
var dataLoad = require('./fileDataLoad');
const qo = require('./queryObject');
import ky from 'ky';



d3.select('.search-icon').on('click', () => {
    const value = (document.getElementById('search-bar')).value;
    let dataOb = new qo.QueryObject(value);
    neoAPI.checkForNode(value).then(found => {
        if (found.length > 0) {
            console.log("already exists");
        } else {
            neoAPI.addToGraph(value, 'Gene');
        }
        search.searchBySymbol(dataOb).then(() => neoAPI.getGraph().then(g => gCanvas.drawGraph(g)));

    });
});

let canvas = d3.select('#graph-render').append('svg').classed('graph-canvas', true);
let linkGroup = canvas.append('g').classed('links', true);
let nodeGroup = canvas.append('g').classed('nodes', true);
let toolDiv = d3.select('body').append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
let queryPanel = d3.select('#wrapper').append('div').attr('id', 'query-panel');

dataLoad.loadFile().then(d=> {
  //  dataLoad.renderSidebar(d);
    let dataOb = new qo.QueryObject(d[0].key);
    dataOb.type = "Gene";
    let varArray = d[0].values.map(v=> {
        let variant = new qo.QueryObject(v.id);
        variant.type = "Variant";
        Object.keys(v).map(key=> {
            variant.properties[key.toString()] = v[key];
            variant.Gene = d[0].key;
            variant.description = variant.name;
            variant.name = variant.dbSnps;
        });
        return variant
    });

    async function initialSearch(queryOb: object){

            let idSearch = await search.searchBySymbol(queryOb);
            let mimId = await search.geneIdtoMim(idSearch);
            let omim = await searchOMIM(mimId);
            console.log("omim", omim)
            return omim;
           
    }
 
    async function isStored(graph: object, nameSearch:string, nodeType:string){
        let foundGraphNodes = graph.nodes.filter(n=> n.properties.symbol == nameSearch);
        let nodeOb = await foundGraphNodes.length > 0 ? foundGraphNodes[0] : initialSearch(dataOb);
       
        neoAPI.addNode(nodeOb, nodeType);
        return nodeOb
    }

    neoAPI.getGraph().then(g => {
      
        let nodeOb = isStored(g[0], 'GJB2', 'Gene').then(nodeO=> {
            let variants = g[0].nodes.filter(d=> d.label == 'Variant');
            gCanvas.drawGraph(g);

            nodeO.properties.allelicVariantList = variants;
        
            qo.structVariants(nodeO).then(node=> {
                console.log(node);
                qo.structPheno(node).then(n=> {
                    gCanvas.renderSidebar(n);
                    gCanvas.renderGeneDetail(n);
                   
            });
        });
        
        });
  
/*


    
  
    neoAPI.addNodeArray(om.properties.allelicVariantList).then(()=> {
        om.properties.allelicVariantList.forEach(v=>{
            neoAPI.addRelation(v.name, 'Variant', om.value, 'Gene', 'Mutation');
        });
    });

    neoAPI.addNodeArray(knownPhenotypes).then(()=> {
        let varNames = om.properties.allelicVariantList.map(v=> v.description.toString())
      
        let relatedPhenotypes = knownPhenotypes.map(p=>{
         
            let pindex = varNames.indexOf(p.description.toString().toUpperCase())
            if(pindex > -1 ){
                p.varIds = om.properties.allelicVariantList[pindex].name;
            }else{
                p.varIds = null;
            }
            return p;
        }).filter(p=> p.varIds != null);

        relatedPhenotypes.forEach(rel => {
            neoAPI.addRelation(rel.name, 'Phenotype', rel.varIds, 'Variant', 'Pheno');
        });
    });

    });


  //  search.getPathways(om);
 

/*
    let variantIds = om.fileVariants.map(v=> v.properties.id);

    let varIdQuery = variantIds.join(',')

    let proxy = 'https://cors-anywhere.herokuapp.com/';
    let url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id='+varIdQuery+'&retmode=json&apiKey=mUYjhLsCRVOuShEhrHLG_w'
   // 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id=328931&retmode=json&apiKey=mUYjhLsCRVOuShEhrHLG_w'
    let req = ky.get(proxy + url).json().then(d=> console.log(d));

  
    /*
                /*
                search.getPathways(om);
                gCanvas.renderGeneDetail(om);
                neoAPI.addNode(om, 'Gene');
                om.properties.allelicVariantList.forEach((variant) => {
                    variant.gene = om.value
                    neoAPI.addNode(variant, 'Variant').then(()=>{ 
                        neoAPI.addRelation(om.value,'Gene', variant.name, 'Variant', 'Mutation');
                    });
                 }).then(()=> neoAPI.getGraph().then(g => gCanvas.drawGraph(g)));
              //  .then(()=> neoAPI.getGraph().then(g => gCanvas.drawGraph(g)));
            });

        });
        
*/
//neoAPI.getGraph().then(g => gCanvas.drawGraph(g));
  //  });
});
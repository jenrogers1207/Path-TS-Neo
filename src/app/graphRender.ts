import "./styles.scss";
import * as d3 from 'D3';
import * as search from './search';
import * as qo from './queryObject';
import { BaseType } from "D3";
const neoAPI = require('./neo4jLoader');
const app = require('./app');

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

export async function renderCalls(promis: Array<object>, selectedNode:Array<object>){

      //  let selectedNames = qo.selected.queryKeeper.map(k=> k.name);
        let selectedNames = selectedNode.map(k=> k.name);

        let data = await Promise.all(promis);
      
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
            renderGeneDetail([d], graph);
            graphRenderMachine(graph[0], [d]);
            renderCalls(promis, [d]);
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
            console.log('dat',dat);
            if(dat.properties.Variants != undefined){
                return dat.properties.Variants.map(d=>{ 
                    d.tag = d.properties.Phenotypes[0][0].clinical_significances;
                    return d;
                });
                
            }else return [];
    
        });
        variants.exit().remove();
        let varEnter = variants.enter().append('div').classed('variant', true);
        let varHead = varEnter.append('div').classed('var-head', true)//.append('h5').text(d=>d.name);
        let varText = varHead.append('h5').text(d=>d.name);
        let varIcon = varHead.append('i').attr('class', d=> d.name);
        varIcon.classed('fas fa-chevron-circle-down', true);
        let spanType = varHead.append('span').text(d=> d.properties.Type);
        spanType.classed('badge badge-info', true);
        let spanTag = varHead.append('span').text(d=> d.tag[0]);
        spanTag.classed('badge badge-warning', true);
      //  let varSpan = varEnter.append('span').classed('w3-tag w3-padding w3-round w3-red w3-center', true).text('path')
       
        varHead.on('click', function(d){
            let text = this.nextSibling;
            d3.select(text).classed('hidden')? d3.select(text).classed('hidden', false) : d3.select(text).classed('hidden', true);
            let icon =  d3.select(this).select('i.'+d.name);
            icon.classed('fa-chevron-circle-down') ? icon.attr('class', d.name+' fas fa-chevron-circle-up') : icon.attr('class', d.name+' fas fa-chevron-circle-down');
        });

        let varDes = varEnter.append('div').classed('var-descript', true).classed('hidden', true);
        let blurbs = varDes.selectAll('.blurb').data(d=>d3.entries(d)
                .filter(f=> f.key != 'allelicVariantList' && f.key != 'text' && f.key != 'name' && f.key != 'properties'))
                .enter().append('div').classed('blurb', true);

        let properties = varDes.selectAll('.props').data(d=> d3.entries(d.properties));
        let propEnter = properties.enter().append('div').classed('props', true);
        let propText = propEnter.append('text').text(d=> d.key + ": "+ d.value);

        let idBlurbs = blurbs.filter(b=> b.key != 'snpProps').append('text').text(d=> d.key + ": "+ d.value);
        let snps = blurbs.filter(b=> b.key == 'snpProps').selectAll('.snp').data(d=> d3.entries(d.value));
        let snpEnter = snps.enter().append('div').classed('snp', true);
        snpEnter.append('text').text(d=> d.key + ": ");
        snps = snpEnter.merge(snps)

        variants = varEnter.merge(variants);
  
        variants.on('mouseover', function(d){
           
        });
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
    let propHead = propEnter.append('div').attr('class', (d)=> d).classed('head-wrapper', true)
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
    let idsSec = idEnter.append('text').text(d=> d.key + ': ' + d.value);

    let location = propEnter.filter(d=> d == "Location").select('.detail-wrapper').selectAll('.location').data(d=> d3.entries(data.properties[d]));
    let locEnter = location.enter().append('div').classed('location', true);
    let locSec = locEnter.append('text').text(d=> d.key + ': ' + d.value);
  
    if(data.properties.Phenotypes.length > 0){
        let phenotype = propEnter.filter(d=> d == "Phenotypes").select('.detail-wrapper').selectAll('.pheno-wrap').data(d=> {
                let phenoD = data.properties[d].map(p=> p.properties);
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

    let models = propEnter.filter(d=> d == "Models").select('.detail-wrapper').selectAll('.des').data(d=> {return d3.entries(data.properties[d])});
    let modEnter = models.enter().append('div').classed('des', true);
    modEnter.append('text').text(d=> d.key + ": " + JSON.stringify(d.value));

    let textProp = propEnter.filter(d=> d == 'Text').select('.detail-wrapper').selectAll('.text').data(d=> {return data.properties[d]});
    let textEnter = textProp.enter().append('div').classed('text', true);
    let headText = textEnter.append('div').classed('text-sec-head', true).append('h5').text(d=> d.textSectionTitle + ': ');
    let textDiv = textEnter.append('div').classed('textbody', true).classed('hidden', true);
    let textText = textDiv.append('text').text(d=> d.textSectionContent);

    headText.on('click', function(d) {
        let text = this.parentNode.nextSibling
        d3.select(text).classed('hidden')? d3.select(text).classed('hidden', false) : d3.select(text).classed('hidden', true);
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

        let newNode = await search.addGene(d);
      
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
export function graphRenderMachine(graphArray:Object, selectedGene:Array<object>){

    let dropdown = d3.select('#topnav').select('.dropdown');
    let dropButton = dropdown.select('.dropdown-toggle');
   
    let key = String(dropButton.text());

    console.log('in graphrendermacine', key);

    const builder = {
        'Align by Gene' : phenoTest,
        'Align by Pathway' : phenoTest,
        'Align by Phenotype' : drawPhenotypes,
        'Whole Network' : drawGraph,
    }
   
    let fun = builder[key];
    fun(graphArray, selectedGene);

   function phenoTest(){
       console.log('is this working align by gene');
   }


}

let drawPhenotypes = function(graphArray:Object, selectedGene:Array<object>){

    let canvas = d3.select('#graph-render').select('.graph-canvas');
    
    canvas.select('.links').selectAll('*').remove();
    canvas.select('.nodes').selectAll('*').remove();

    let phenoData = graphArray.nodes.filter(d=> d.label == 'Phenotype').map(p=> {
        let phen = p.properties;
        phen.properties = JSON.parse(p.properties.properties);
        return phen;
    });

    console.log(phenoData);

    canvas.style('height', (150*phenoData.length) + 'px');

    let node = canvas.select('.nodes').append('g').classed('pheno-wrap', true).selectAll('.pheno-tab').data(phenoData);
   // node.attr('transform', (d, i)=> 'translate(100, '+(30*i)+')')
  //  node.exit().remove();

    let nodeEnter = node
        .enter().append('g')
        .attr("class", (d)=> 'pheno-tab '+d.name);

    nodeEnter.attr('transform', (d, i)=> 'translate(100, '+(130*i)+')')

    let circleP = nodeEnter.append('circle').attr('cx', 320).attr('cy', 100);
    circleP.classed('pheno-c', true);

    let textBlurb = nodeEnter.append('g').selectAll('text').data(d=> d3.entries(d.properties).filter(k=> k.key != 'associatedGene' && k.key != 'OMIM'));
    textBlurb.enter().append('text').text(d=> {
        if(d.key == 'description'){return d.value
        }else{
        return  d.key+': '+ d.value;
        }
       
    }).attr('x', 0).attr('y', (d, i)=> 90 + (i* 15));

    let circleG = nodeEnter.append('circle').attr('cx', 460).attr('cy', 100);
    circleG.classed('pheno-g', true);

    nodeEnter.append('text').text(d=> d.properties.associatedGene).attr('x', 446).attr('y', 86);

    let circleVar = nodeEnter.append('circle').attr('cx', 550).attr('cy', 100);
    circleVar.classed('pheno-v', true);

}

function drawGraph(graphArray: Object, selectedGene: Array<object>) {

    //let selectedNames = qo.selected.queryKeeper.map(k=> k.name);
    let selectedNames = selectedGene.map(m=> m.name);

    let data = graphArray;

    let canvas = d3.select('#graph-render').select('.graph-canvas'),
        width = +canvas.attr("width"),
        height = +canvas.attr("height"),
        radius = 20;

    canvas.select('.links').selectAll('*').remove();
    canvas.select('.nodes').selectAll('*').remove();

    // Define the div for the tooltip
    var toolDiv = d3.select('.tooltip');

    let simulation = d3.forceSimulation()
        .velocityDecay(0.1)
        .force("link", d3.forceLink().distance(120).strength(.5))
        .force("x", d3.forceX(width / 2).strength(.05))
        .force("y", d3.forceY(height / 2).strength(.05))
        .force("charge", d3.forceManyBody().strength(-80))
        .force('center', d3.forceCenter(400, 250));

    var link = canvas.select('.links')
        .selectAll(".line")
        .data(data.links);

    link.exit().remove();

    let linkEnter = link
        .enter().append("line")
        .classed('line', true)
        .attr("stroke-width", 2)
        .attr('stroke', '#9999');

    link = linkEnter.merge(link);

    let node = canvas.select('.nodes').selectAll('g').data(data.nodes);
    node.exit().remove();
    let nodeEnter = node
        .enter().append("g")
        .attr("class", function(d) {

            if(d.label.includes('Gene')){
                return "node Gene"
            }else{
                return "node " + d.label[0];
            }
           
        });

    let circles = nodeEnter.append('circle')
        .call(d3.drag()
            .on("start", dragstarted)
           .on("drag", dragged)
            .on("end", dragended))
         //   .on('dblclick', connectedNodes); 

    let geneNode = nodeEnter.filter(d => d.label.includes('Gene'));

    nodeEnter.filter(d=> selectedNames.includes(d.name)).classed('selected', true);

    geneNode.classed("fixed", d=> d.fixed = true);

    function dragstart(d) {
        d3.select(this).classed("fixed", d.fixed = true);
      }

      dragstart(geneNode);

      var toggle = 0;
//Create an array logging what is connected to what
   
    let labels = geneNode.append('text').text(d => d.name).style('color', '#ffffff').attr('x', 0)
        .attr('y', 3).attr('text-anchor', 'middle');

    nodeEnter.append("title")
        .text(function(d) { return d.name; });

    node = nodeEnter.merge(node);

    node.on('click', async function(d){
       
        let mapped = qo.selected.queryKeeper.map(m=> m.name);
        canvas.select('.nodes').selectAll('.selected').classed('selected', false);
        d3.select(this).classed('selected', true);
        let newSelected = await qo.structGene(d);
        let queryKeeper = qo.allQueries.queryKeeper.map(m=> m);
        renderGeneDetail([newSelected], graphArray);
        renderCalls(queryKeeper, [newSelected]);

        if(mapped.includes(d.properties.name)){
            console.log('ALLREADY IN THE KEEPER');
            qo.selected.removeQueryOb(d.properties.name);
        }else{
            qo.selected.addQueryOb(d.properties);
        }      
    });

    node.on("mouseover", function(d) {
            toolDiv.transition()
                .duration(200)
                .style("opacity", .8);
            if(d.label == 'Phenotype'){
                toolDiv.html(JSON.parse(d.properties.properties).description + "<br/>")
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
            }else{
                toolDiv.html(d.name + "<br/>")
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
            }
            
        })
        .on("mouseout", function(d) {
            toolDiv.transition()
                .duration(500)
                .style("opacity", 0);
    });

    simulation
        .nodes(data.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(data.links);

    function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(1);
        d.fx = null;
        d.fy = null;
    }

    function ticked() {
        link.attr("x1", d => {
            return d.source.x;
        }).attr("y1", d => {
            return d.source.y;
        }).attr("x2", d => {
            return d.target.x;
        }).attr("y2", d => {
            return d.target.y;
        });

        node
            .attr("transform", function(d) { return "translate(" + d.x + ", " + d.y + ")"; });

    }

}